const express = require('express')
const jwt = require('jsonwebtoken')
const request = require('request')
const boom = require('boom')
const { body, validationResult } = require('express-validator')
const Result = require('../models/Result')
const userService = require('../services/user')
const db = require('../db')
const svgCaptcha = require('svg-captcha');
const uuid = require('node-uuid');
const base64 = require('js-base64');

//v1是根据时间戳生成的
//v4是根据随机数生成的
//如需保证唯一性，建议使用v1
// var uuid1 = uuid.v1();
// var uuid4 = uuid.v4();
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
  async function(req, res, next) {
    const err = validationResult(req)

    if (!err.isEmpty()) {
      const [{ msg }] = err.errors
      next(boom.badRequest(msg))
    } else {
      const username = req.body.username
      const password = md5(`${req.body.password}${PWD_SALT}`)
      const user = await userService.login({ username, password }, next)
      if (user) {
        const token = jwt.sign(
          { username },
          PRIVATE_KEY,
          { expiresIn: JWT_EXPIRED }
        )
        new Result({ token, appid: base64.encode(uuid.v1())}, '登录成功').success(res)
      } else {
        new Result(null, '用户名或密码不存在').fail(res)
      }
    }
  }
)



let githubConfig = {
  // 获取 access_token
  access_token_url: 'https://github.com/login/oauth/access_token',
  // 获取用户信息
  user_info_url: 'https://api.github.com/user?',

  // 携带的参数
  form: {
   // 客户ID
    client_id: 'Iv1.243cc65a0c47f657',
    // 客户密匙
    client_secret: '3952ed099f8af043abe734414d2c7cb5bc9ed385',
    // 回调地址
    redirect_uri: 'http://localhost:9527/login' 
  },

  async requestCallBack(res, error, response, body){
    let params = body && JSON.parse(body)
    if (!error && response.statusCode == 200) {
      let urlStr = githubConfig.user_info_url + body;
      try {
        request({
          method: 'GET',
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
                avatar: data.avatar_url,
              }, 'admin_user')
            } 
           
            const token = jwt.sign(
              { username: data.login, },
              PRIVATE_KEY,
              { expiresIn: JWT_EXPIRED }
            )

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
}


let giteeConfig = {
  // 获取 access_token的Url
  access_token_url: 'https://gitee.com/oauth/token',
  // 获取用户信息
  user_info_url: 'https://gitee.com/api/v5/user',

  // 携带的参数
  form: {
    grant_type: 'authorization_code', // code码的方式
    // 客户ID
    client_id: 'e9c3233a5e2863c1ac6d82c82e1b64119429bae4c00e7b30e46571ad136f505d',
    // 客户密匙
    client_secret: '32aa959945d78ea9a0e9421abe1c2193a28c95fa1a57eb7f2336d2f739482c13',
    // 回调地址
    redirect_uri: 'http://localhost:9527/login' 
  },

  async requestCallBack(res, error, response, body) { // 请求后的处理函数
    let params = body && JSON.parse(body)
    if (error || response.statusCode !== 200)  return
    try {
      request({
        method: 'GET',
        url: giteeConfig.user_info_url,
        headers: {
          'User-Agent': 'it-beige',
          'Authorization': `${params.token_type} ${params.access_token}`
        },
        params: {
          access_token: params.access_token
        }
      },
      async function(error, response, resbody){
        if (!error) {
          let data = JSON.parse(resbody)
          const user = await userService.findUser({ username: data.login })
          // 第一次gitHub授权向数据库存入用户数据
          if (!user) {
            db.insert({
              username: data.login,
              password: md5(`${data.login}${PWD_SALT}`), 
              role: 'editor',
              nickname: data.name,
              avatar: data.avatar_url,
            }, 'admin_user')
          } 
         
          const token = jwt.sign(
            { username: data.login, },
            PRIVATE_KEY,
            { expiresIn: JWT_EXPIRED }
          )

          new Result(Object.assign(data, {roles: 'editor', role: 'editor', token, name: data.name, password: md5(`${data.login}${PWD_SALT}`)}), '登录成功').success(res)
        } else {
          new Result(null, '获取用户信息失败').fail(res)
        }
      })
    } catch(e) {
      console.log(e);
    }
  },

}

let baiduConfig = {
  // 获取 access_token的Url
  access_token_url: 'https://openapi.baidu.com/oauth/2.0/token',
  // 获取用户信息
  user_info_url: 'https://openapi.baidu.com/rest/2.0/passport/users/getInfo',

  // 携带的参数
  form: {
    grant_type: 'authorization_code', // code码的方式
    // 客户ID
    client_id: 'uEYaSmr5RfS9Gj1MrWiw01jq',
    // 客户密匙
    client_secret: '0vAljG07lwbNPG7tl6ALoZ6V4BiPH8B3',
    // 回调地址
    redirect_uri: 'http://localhost:9527/login' 
  },

  async requestCallBack(res, error, response, body) { // 请求后的处理函数
    let params = body && JSON.parse(body)
    console.log(params);
    if (error || response.statusCode !== 200)  return
    try {
      request({
        method: 'GET',
        url: baiduConfig.user_info_url + `?access_token=${params.access_token}`,
      },
      async function(error, response, resbody){
        console.log(error, resbody);
        let data = resbody && JSON.parse(resbody)
        
        if (!error && !data.error_code) {
          const user = await userService.findUser({ username: data.username })
          // 第一次gitHub授权向数据库存入用户数据
          if (!user) {
            db.insert({
              username: data.username,
              password: md5(`${data.login}${PWD_SALT}`), 
              role: 'editor',
              nickname: data.realname,
              avatar: `https://tb.himg.baidu.com/sys/portraitn/item/${data.portrait}`, // 百度的头像返回的是后缀
            }, 'admin_user')
          } 
         
          const token = jwt.sign(
            { username: data.username, },
            PRIVATE_KEY,
            { expiresIn: JWT_EXPIRED }
          )

          new Result(Object.assign(data, {roles: 'editor', role: 'editor', token, name: data.username, password: md5(`${data.username}${PWD_SALT}`)}), '登录成功').success(res)
        } else {
          new Result(null, '获取用户信息失败').fail(res)
        }
      })
    } catch(e) {
      console.log(e);
    }
  },

}

let authConfigHash = {
  wechat: {},
  tencent: {},
  gitHuh: githubConfig,
  gitee: giteeConfig,
  baidu: baiduConfig,
}

router.get('/thirdpart/login', async function(req, res, next) {
  let {
    code, // 第三方应用返回的code码
    authType, // 第三方应用名称
  } = req.query
  if (!code) return;
  let config = authConfigHash[authType] // 第三方应用配置项
  if (!config) return
 
  let form = Object.assign({}, config.form, {code})
  request(
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      url: config.access_token_url,
      form
    },
    config.requestCallBack.bind(null, res)
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

var codeConfig = {
   size: 4,// 验证码长度
   ignoreChars: '0o1i', // 验证码字符中排除 0o1i
   noise: 3, // 干扰线条的数量
   fontSize: 50,
   color: true,//开启文字颜色
   background:"#30B08F",//背景色
   width: 100,
   height: 35
}
router.post('/getCode', async function(req, res, next) {
  const captcha = svgCaptcha.create(codeConfig);
  // 通过 res.cookie方法来设置cookie,将验证码文字种在cookie发送给前端用于校验
  res.cookie('codeText', captcha.text)
  
  // 将svg编译成base64
  let Base64SvgStr = Buffer.from(captcha.data).toString('base64')
  // 将base64加止前缀方便前端使用img展示 
  let codeSrc = `data:image/svg+xml;base64,${Base64SvgStr}`
  new Result({codeSrc, codeType: 'base64', codeKey: 'codeText'}, '获取验证码成功').success(res, false)
})



router.post('/logout', function(req, res, next) {
  new Result(null, '退出成功').success(res)
})

module.exports = router
