const Book = require('../models/Book')
const db = require('../db/index')
const _ = require('lodash');
const { reject, times } = require('lodash');
const { debug } = require('../utils/env');

// 判断图书是否存在
function exists(book) {
  let {
    title,
    author,
    publisher
  } = book;
  let sql = `select * from book where title='${title}' and author='${author}' and publisher='${publisher}'`;
  return db.queryOne(sql)
}

// 移除数据库已经存在的图书
async function removeBook(book) {
  if (book) {
    // 重置信息
    book.reset();
    if (book.fileName) {
      // 删除数据库中存在的电子书
      let deleteBook = `delete from Book where fileName='${book.fileName}'`;
      deleteContents = `delete from contents where fileName='${book.fileName}'`;
      await db.querySql(deleteBook);
      await db.querySql(deleteContents);
    }
  }
} 
// 向数据库中插入图书
async function insertContents(book) {
  let contents = book.getContents()
  if (contents && contents.length > 0) {
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      const _contents = _.pick(content, [
        'fileName',
        'pid',
        'id',
        'navId',
        'href',
        'order',
        'level',
        'label',
        'text',
      ])
      await db.insert(_contents, 'contents')
    }
  }
}

/* 
  TODO 该方法用到了多处数据库操作，尽量通过await同步化, 避免太多的.then出现 
*/
function insertBook(book) {
  return new Promise(async (resolve, reject) => {
    try {
      if (book instanceof Book) {
        const isExist = await exists(book);
        if (isExist) {
          reject(new Error('不能重复上传图书')); 
          await removeBook(book);
        }  else {
          await db.insert(book.toDb(), 'book');
          await insertContents(book)
          resolve()
        }
      } else {
        reject(new Error('添加的图书对象不合法'))
      }
    } catch (err) {
      reject(err)
    }
  })
}


/**
 * 
 * @param {Sring} fileName 
 * @desc 获取当前图片的filename所对应的数据
 */
function getBook(fileName) {
  return new Promise(async (resolve, reject) => {
    let sqlBook = `select * from Book where fileName='${fileName}'`;
    let sqlContents = `select * from contents where fileName='${fileName}' order by \`order\` `;
    let book = await db.queryOne(sqlBook);
    let contents = await db.querySql(sqlContents);
    if (book) {
      book.coverURL = Book.getCoverUrl(book);
      book.contentsTree = Book.getContentsTree(contents);
      resolve(book)
    } else {
      reject(new Error('当前图书不存在'))
    }
  })
}


/**
 * 
 * @param {Object} book 
 * @info 根据传递过来的图书信息从数据库中匹配
 */
function updateBook(book) {
  return new Promise(async (resolve, reject) => {
    if (book instanceof Book) {
      let result = await getBook(book.fileName);
      if (+result.updateType === 0) {
        reject(new Error('内置图书不能编辑'))
      } else {
        let model = book.toDb();
        await db.update(model, 'book', `where fileName='${book.fileName}'`);
        resolve()
      }
    } else {
      reject(new Error('编辑的图书不合法'));
    }
  })
}

/**
 * @info 获取图书分类
 */
function categoryBook() {
  return new Promise(async (resolve, reject) => {
    const sql = `select * from category order by category asc`;
    const res = await db.querySql(sql)
    if (res && res.length > 0) {
      const categoryList = [];
      res.forEach(item => {
        categoryList.push({
          label: item.categoryText,
          value: item.category,
          num: item.num
        })
      })
      resolve(categoryList)
    } else {
      reject(new Error('图书分类不存在'));
    }
  })
}


/**
 * info 获取图书列表
 */
async function getBookList(queryParams) {
  debug && console.log(queryParams);
  const {
    title,
    author,
    category,
    sort,
    page = 1,
    pageSize = 15,
  } = queryParams;
  let sql = `select * from book `,
      where = `where`,
      offset = (page - 1) * pageSize;
  category && (where = db.and(where, 'categoryText', category))
  author && (where = db.andLike(where, 'author', author))
  title && (where = db.andLike(where, 'title', title))
  
  /* 有where条件时加上 */
  if (where !== 'where') {
      sql = `${sql} ${where}`
  }
  if (sort) {
    const symbol = sort[0];
    let field = sort.slice(1, sort.length);
    let order = symbol === '+' ? 'asc' : 'desc';
    sql += ` order by ${field} ${order}`
  }
  let countSql = `select count(*) as count from book ${where === 'where' ? '' : where}`;
  let countResult = await db.querySql(countSql);
  sql += ` limit ${pageSize} offset ${offset}`
  const list = await db.querySql(sql)
  list.forEach(book => book.cover = Book.getCoverUrl(book))
  return {list, count: countResult[0].count, page: +page, pageSize: +pageSize}
}

/**
 * @info 删除图书
 */
function deleteBook(fileName) {
  return new Promise(async (resolve, reject) => {
    let book = await getBook(fileName);
    if (+book.updateType === 0) {
      reject(new Error('内置图书不能删除'))
    } else {
      let bookOBj = new Book(null, book);
      console.log('bookOBj----------------------->', bookOBj);
      let sql = `delete from book where fileName='${fileName}'`;
      db.querySql(sql)
        .then(() => {
          bookOBj.reset();
          resolve()
        })
    }
   
  })
}


module.exports = {
  insertBook,
  getBook,
  updateBook,
  categoryBook,
  getBookList,
  deleteBook
}