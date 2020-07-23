// 引入express中间件
const express = require('express');
// 创建express应用
const app = express();
const fs = require('fs')
const https = require('https')
const router = require('./router/index.js')

// 对路由处理进行解耦
app.get('/', router)


// 搭建https服务
const privateKey = fs.readFileSync('./https/ht.beige.world.key', 'utf8')
const certificate = fs.readFileSync('./https/ht.beige.world.pem', 'utf8')


const credentials = {
  key: privateKey,
  cert: certificate
}
const httpsServer = https.createServer(credentials, app)
const SSLPORT = 18082
httpsServer.listen(SSLPORT, function () {
  console.log('HTTPS Server is running on: https://localhost:%s', SSLPORT)
})


// 使 express 监听 5000 端口号发起的 http 请求
const serverPort = '5000'
const server = app.listen(serverPort, function () {
  let {
    address,
    port
  } = server.address();
  console.log('Http Server is running on http://ht.beige.world:18082')
})