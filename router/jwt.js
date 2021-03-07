const expressJwt = require('express-jwt');
const { PRIVATE_KEY } = require('../utils/constant');

const jwtAuth = expressJwt({
  secret: PRIVATE_KEY,
  algorithms: ['HS256'], // 加密算法, 在6.0版本需要加上
  credentialsRequired: true // 设置为false就不进行校验了，游客也可以访问
}).unless({
  path: [
    '/',
    '/user/login',
    '/user/getCode',
    '/user/thirdpart/login',
    '/book/clear'
  ],
});

module.exports = jwtAuth;
