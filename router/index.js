const {
  CODE_ERROR,
  CODE_TOKEN_EXPIRED
} = require('../utils/constant')

const express = require('express')
const boom = require('boom')
const jwtAuth = require('./jwt')
const userRouter = require('./user')
const bookRouter = require('./book')

// 注册路由
const router = express.Router()

// 对后续请求进行身份验证
router.use(jwtAuth)

router.get('/', function(req, res) {
  res.send('欢迎学习小慕读书管理后台')
})

// 对路由模块进行独立
router.use('/user', userRouter)
router.use('/book', bookRouter)


/**
 * 集中处理404请求的中间件
 * 注意：该中间件必须放在正常处理流程之后
 * 否则，会拦截正常请求
 */
router.use((req, res, next) => {
  next(boom.notFound('接口不存在'))
})

/**
 * 自定义路由异常处理中间件
 * 注意两点：
 * 第一，方法的参数不能减少
 * 第二，方法的必须放在路由最后
 */
router.use((err, req, res, next) => {
  // 对token失效进行提示
  if (err.name === 'UnauthorizedError') {
    res.json({
      code: CODE_TOKEN_EXPIRED,
      msg: '登录超时,请重新登录',
      error: err.status,
      errorMsg: err.name
    })
  } else {
    const msg = (err && err.message) || '系统错误'
    const statusCode = (err.output && err.output.statusCode) || 500;
    const errorMsg = (err.output && err.output.payload && err.output.payload.error) || err.message
    res.status(statusCode).json({
      code: CODE_ERROR,
      msg,
      error: statusCode,
      errorMsg
    })
  }
})
  
module.exports = router