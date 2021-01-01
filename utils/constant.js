const { env } = require('./env'); // 引入环境配置
// 本地路径
const UPLOAD_PATH = env === 'dev' ? 'h:/imooc/admin-upload-ebook' : '/root/upload/admin-upload/ebook';

// 路径对应的Url
const UPLOAD_URL = env === 'dev' ? 'http://localhost:9000/admin-upload-ebook' : 'https://ht.beige.world/admin-upload-ebook';

// 路径对应的Url
const OLD_UPLOAD_URL = env === 'dev' ? 'https://book.youbaobao.xyz/book/res/img' : 'https://book.youbaobao.xyz/book/res/img';


module.exports = {
  CODE_ERROR: -1, // 错误码
  CODE_SUCCESS: 20000, // 成功码
  CODE_TOKEN_EXPIRED: -2, // token检验失败的错误码
  PWD_SALT: 'admin_beige_world', // token二次加密
  PRIVATE_KEY: 'admin_beige_world', // jwt认证私钥
  JWT_EXPIRED: 60 * 60, // token失效时间
  UPLOAD_PATH, // 图书上传存储的文件夹
  UPLOAD_URL, // 图书上传存储对应的url
  OLD_UPLOAD_URL, // 数据库图书上传存储对应的url--sql数据表生成上传图书
  MEME_TYPE_EPUB: 'application/epub+zip', // 图书上传的文件类型
  UPDATE_TYPE_FROM_WEB: 1, 
}