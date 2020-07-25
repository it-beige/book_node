const express = require('express');
const multer = require('multer');
const { UPLOAD_PATH } = require('../utils/constant');
const Result = require('../models/Result');

const router = express.Router();

router.post(
  '/upload', 
  multer({dest: `${UPLOAD_PATH}/book`}).single('file'),
  function(req, res, next) {
    if (!req.file) {
      new Result('上传电子书失败').json(res);
    } else {
      new Result('上传电子书成功').json(res);
    }
  }
)

module.exports = router;