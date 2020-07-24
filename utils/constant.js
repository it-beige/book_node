const { env } = require('./env'); // 引入环境配置
const UPLOAD_PATH = env === 'dev' ? 'h:/imooc/admin-upload-ebook' : '/root/upload/admin-upload/ebook';

module.exports = {
  CODE_ERROR: -1, // 错误码
  CODE_SUCCESS: 0, // 成功码
  CODE_TOKEN_EXPIRED: -2, // token检验失败的错误码
  PWD_SALT: 'admin_imooc_node', // token二次加密
  PRIVATE_KEY: 'admin_beige_world', // jwt认证私钥
  JWT_EXPIRED: 60 * 60, // token失效时间
  UPLOAD_PATH, // 图书上传存储的文件夹
}