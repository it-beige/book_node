// 引入express中间件
const express = require('express');
// 创建express应用
const app = express();

const router = require('./router/index.js')

// 对路由处理进行解耦
app.get('/', router)



// 使 express 监听 5000 端口号发起的 http 请求
const serverPort = '5000'
const server = app.listen(serverPort, function () {
  let {address, port} = server.address();
  console.log('Http Server is running on http://%s:%s', address, port)
})



