const express = require('express');
const multer = require('multer');
const { UPLOAD_PATH } = require('../utils/constant');
const Result = require('../models/Result');
const Book = require('../models/Book');
const boom = require('boom');
const {decode} = require('../utils/index')
const servicesBook = require('../services/book');
const Boom = require('boom');

const router = express.Router();

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

router.get('/get', function(req, res, next) {
  let { fileName } = req.query;
  console.log('fileName---------->', fileName);
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

module.exports = router;