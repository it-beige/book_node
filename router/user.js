const express = require('express')
const jwt = require('jsonwebtoken')
const request = require('request')
const boom = require('boom')
const { body, validationResult } = require('express-validator')
const Result = require('../models/Result')
const userService = require('../services/user')
const db = require('../db')

const {
  PWD_SALT,
  PRIVATE_KEY,
  JWT_EXPIRED
} = require('../utils/constant')
const { md5, decode } = require('../utils')

const router = express.Router()

router.post(
  '/login',
  [
    body('username').isString().withMessage('username类型不正确'),
    body('password').isString().withMessage('password类型不正确')
  ],
  function(req, res, next) {
    const err = validationResult(req)
    if (!err.isEmpty()) {
      const [{ msg }] = err.errors
      next(boom.badRequest(msg))
    } else {
      const username = req.body.username
      const password = md5(`${req.body.password}${PWD_SALT}`)
      const user = userService.login({ username, password }, next)
      if (user) {
        const token = jwt.sign(
          { username },
          PRIVATE_KEY,
          { expiresIn: JWT_EXPIRED }
        )
        new Result({ token }, '登录成功').success(res)
      } else {
        new Result(null, '用户名或密码不存在').fail(res)
      }
    }
  }
)


let githubConfig = {
  // 客户ID
  client_ID: 'Iv1.xxxxxx',
  // 客户密匙
  client_Secret: 'xxxxxxxxx',
  // 获取 access_token
  // eg: https://github.com/login/oauth/access_token?client_id=7***************6&client_secret=4***************f&code=9dbc60118572de060db4&redirect_uri=http://manage.hgdqdev.cn/#/login
  access_token_url: 'https://github.com/login/oauth/access_token',
  // 获取用户信息
  // eg: https://api.github.com/user?access_token=86664b010dbb841a86d4ecc38dfeb8ac673b9430&scope=&token_type=bearer
  user_info_url: 'https://api.github.com/user?',
  // 回调地址
  //  redirect_uri: 'http://book.beige.world'
  redirect_uri: 'http://localhost:9527/login' // -> 本地测试
}
router.get('/thirdpart/login', async function(req, res, next) {
  console.log(req.query.code);
  if (!req.query.code) return;
  request(
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
  
      },
      url: githubConfig.access_token_url,
      form: {
        client_id: githubConfig.client_ID,
        client_secret: githubConfig.client_Secret,
        code: req.query.code,
        // code: '27a1834123e21ba9ba9c',
        redirect_uri: githubConfig.redirect_uri
      }
    },
    function(error, response, body){
      console.log(`------------->${body}`);
      let params = body && JSON.parse(body)
      if (!error && response.statusCode == 200) {
        let urlStr = githubConfig.user_info_url + body;
        try {
          request({
            url: urlStr,
            headers: {
              'User-Agent': 'it-beige',
              'Authorization': `bearer ${params.access_token}`
            }
          },
          async function(error, response, resbody){
            
            if (!error) {
              let data = JSON.parse(resbody)
              // console.log(data);
              const user = await userService.findUser({ username: data.login })
              // 第一次gitHub授权向数据库存入用户数据
              if (!user) {
                db.insert({
                  username: data.login,
                  password: md5(`${data.login}${PWD_SALT}`), 
                  role: 'editor',
                  nickname: data.login,
                  avatar: 'http://resource.beige.world/imgs/logo.jpg',
                }, 'admin_user')
              } 
             
              const token = jwt.sign(
                { username: data.login },
                PRIVATE_KEY,
                { expiresIn: JWT_EXPIRED }
              )

              console.log(Object.assign(data, {roles: 'editor', role: 'editor', token, name: data.login}))
              new Result(Object.assign(data, {roles: 'editor', role: 'editor', token, name: data.login, password: md5(`${data.login}${PWD_SALT}`)}), '登录成功').success(res)
            }else{
              new Result(null, '获取用户信息失败').fail(res)
            }
          })
        } catch(e) {
          console.log('1111111111111');
        }
      }else{
        new Result(null, '获取用户信息失败').fail(res)
      }
    }
  )
})



router.get('/info', async function(req, res, next) {
  const decoded = decode(req)
  if (decoded && decoded.username) {
    const user = await userService.findUser({ username: decoded.username })
    if (user) {
      delete user.password
      user.roles = [user.role]
      new Result(user, '获取用户信息成功').success(res)
    } else {
      new Result(null, '获取用户信息失败').fail(res)
    }
  } else {
    new Result(null, '用户信息解析失败').fail(res)
  }
})

router.post('/logout', function(req, res, next) {
  new Result(null, '退出成功').success(res)
})

module.exports = router
