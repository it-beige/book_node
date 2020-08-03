const express = require('express');
const multer = require('multer');
const { UPLOAD_PATH } = require('../utils/constant');
const Result = require('../models/Result');
const Book = require('../models/Book');
const boom = require('boom');
const {decode} = require('../utils/index')
const servicesBook = require('../services/book');
const Boom = require('boom');
const { response } = require('express');


const router = express.Router();

/**
 * @info 图书上传功能 
 */
router.post(
  '/upload', 
  multer({dest: `${UPLOAD_PATH}/book`}).single('file'),
  function(req, res, next) {
    if (!req.file) {
      new Result('上传电子书失败').json(res);
    } else {
      // 通过Book类来获取当前图书的信息
      const book = new Book(req.file)
      book.parse()
        .then(book => {
          new Result(book, '上传电子书成功').json(res);
        })
        .catch(err => {
          next(boom.badImplementation(err))
        })
    }
  }
)
/**
 * @info 上传图书
 */
router.post('/create', function(req, res, next) {
  const userInfo = decode(req)
  if (userInfo && userInfo.username) {
    let {username} = userInfo;
    let book = new Book(null, {...req.body, username})
    servicesBook.insertBook(book)
      .then(() => {
        new Result('新增电子书成功').success(res)
      })
      .catch(err => {
        console.log('/book/create', err)
        next(boom.badImplementation(err))
      })
  }
})

/**
 * @info 获取图书
 */
router.get('/get', function(req, res, next) {
  let { fileName } = req.query;
  if (!fileName) {
    next(Boom.badRequest(new Error('编辑的图书不存在')))
  } else {
    servicesBook.getBook(fileName)
      .then(book => {
        console.log(book);
        new Result(book, '获取图书成功').success(res)
      })
      .catch(e => {
        next(boom.badImplementation(e))
      })
  }
})

/**
 * @info 编辑图书
 */
router.post('/update', function(req, res, next) {
  const userInfo = decode(req)
  if (userInfo && userInfo.username) {
    let {username} = userInfo;
    let book = new Book(null, {...req.body, username})
    console.log(book);
    servicesBook.updateBook(book)
      .then(() => {
        new Result('更新电子书成功').success(res)
      })
      .catch(err => {
        console.log('/book/update', err)
        next(boom.badImplementation(err))
      })
  }
})

/**
 * @info 图书分类
 */
router.get('/category', function(req, res, next) {
  servicesBook.categoryBook()
    .then((response) => {
      new Result(response, '获取图书分类成功').success(res)
    })
    .catch((err) => {
      console.log('/book/category', err)
      next(boom.badImplementation(err))
    })
})

/**
 * @info 图书列表
 */
router.get('/delete', function(req, res, next) {
  servicesBook.deleteBook(req.query.fileName)
    .then(response => {
        new Result('删除图书成功').success(res)
    })
    .catch(err => {
      next(boom.badImplementation(err))
    })
})


/**
 * @info 删除图书
 */
router.get('/list', function(req, res, next) {
  servicesBook.getBookList(req.query)
    .then(response => {
        new Result(response, '获取图书列表成功').success(res)
    })
    .catch(err => {
      next(boom.badImplementation(err))
    })
})

module.exports = router;