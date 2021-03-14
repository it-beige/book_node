// 引入express中间件
const express = require('express');
const fs = require('fs') // 文件读取
const https = require('https') // 搭建https服务
const router = require('./router/index') // 路由解耦
const cors = require('cors') // 跨域
const bodyParser = require('body-parser') // 对参数进行解析
// 创建express应用
const app = express();

// 后台通过cors允许前端跨域
app.use(cors())

// 对前端发送的请求解析
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


// 对路由处理进行解耦
app.use('/', router)




// 使用 express 监听 5000 端口号发起的 http 请求
const serverPort = '5000'
const server = app.listen(serverPort, function () {
  let {
    address,
    port
  } = server.address();
  console.log('Http Server is running on http://localhost:%s', address, port)
})

// 搭建https服务
const privateKey = fs.readFileSync('./https/book.beige.world.key', 'utf8')
const certificate = fs.readFileSync('./https/book.beige.world.pem', 'utf8')
const credentials = {
  key: privateKey,
  cert: certificate
}
const httpsServer = https.createServer(credentials, app)
const SSL_PORT = 18082
httpsServer.listen(SSL_PORT, function () {
  console.log('HTTPS Server is running on: https://book.beige.world:%s', SSL_PORT)
})