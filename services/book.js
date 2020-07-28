const Book = require('../models/Book')
const db = require('../db/index')
const _ = require('lodash')

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
        'text'
      ])
      console.log('_contents', _contents);
      await db.insert(_contents, 'contents')
    }
  }
}

/* 
  TODO 该方法用到了数据库操作，尽量通过await同步化, 避免太多的.then出现 
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

module.exports = {
  insertBook
}