const {
  MEME_TYPE_EPUB,
  UPLOAD_PATH,
  UPLOAD_URL,
  UPDATE_TYPE_FROM_WEB
} = require('../utils/constant');
const fs = require('fs');
const Epub = require('../utils/epub');
const xml2js = require('xml2js').parseString
const path = require('path');

class Book {
  constructor(file, data) {
    if (file) {
      this.createBookFormFile(file)
    }

    if (data) {
      this.createBookFormData(data)
    }
  }

  // 从文件创建book对象
  createBookFormFile(file) {
    const {
      destination, // 文件本地存储目录
      filename, // 文件名称
      mimetype = MEME_TYPE_EPUB, // 文件资源类型
      path,
      originalname
    } = file;
    const suffix = mimetype === MEME_TYPE_EPUB ? '.epub' : ''; // 获取文件后缀
    const oldBookPath = path; // 文件的原有路径
    const bookPath = `${destination}/${filename}${suffix}` // 文件的新路径
    const url = `${UPLOAD_URL}/book/${filename}${suffix}`; // 文件下载的Url
    const unzipPath = `${UPLOAD_PATH}/unzip/${filename}` //文件解压后的文件夹路径
    const unzipUrl = `${UPLOAD_URL}/unzip/${filename}` //文件解压后的文件夹路径
    if (!fs.existsSync(unzipPath)) {
      fs.mkdirSync(unzipPath, {
        recursive: true
      }) // 创建电子书解压后的目录
    }
    if (fs.existsSync(unzipPath) && !fs.existsSync(bookPath)) {
      fs.renameSync(oldBookPath, bookPath);
    }
    this.fileName = filename // 文件名
    this.path = `/book/${filename}${suffix}` // epub文件相对路径
    this.unzipPath = `/unzip/${filename}` // 解压后的文件相对路径
    this.filePath = this.path // epub文件路径
    this.url = url // epub文件下载链接
    this.title = '' // 书名
    this.author = '' // 作者
    this.publisher = '' // 出版社
    this.contents = [] // 目录
    this.coverPath = '' // 封面图片存储位置
    this.coverURL = '' // 封面图片URL
    this.category = -1 // 分类ID
    this.categoryText = '' // 分类名称
    this.language = '' // 语种
    this.unzipUrl = unzipUrl // 解压后的电子书链接
    this.originalName = originalname
  }


  // 从数据创建book对象
  createBookFormData(data) {  
    
  }

  
  // 电子书解析
  parse() {
    return new Promise((resolve, reject) => {
      const path = `${UPLOAD_PATH}/${this.filePath}`;
      if (!fs.existsSync(path)) {
        reject(new Error('电子书不存在'));
      } else {
        const epub = new Epub(path)
        epub.parse()

        // 解析失败调用 
        epub.on('error', function(err) {
          reject(err);
        })

        // 解析完成调用 
        epub.on('end', (err) => {
          if (err) {
            reject(err);
          } else {
            // console.log('epub', epub)
            const {
              title,
              cover,
              creator,
              creatorFileAs = creator ? creator : 'Unknown',
              language,
              publisher,
            } = epub.metadata;
            if (!title) { // 书名都不存在还解析个啥
              reject(err)
            } else {
              this.title = title;
              this.cover = cover;
              this.author = creator || 'Unknown';
              this.language = language || 'en';
              this.publisher = publisher || 'Unknown';
              this.rootFile = epub.rootFile; // 电子书解析的根文件
              /* eslint-disabled */
              const _this = this; // TODO 该库用的回调比较多, 如果不使用箭头函数注意this的指向问题
              const handlerGetImage = (err, file, mime) => {
                if (err) {
                  reject(err);
                } else {
                  const suffix = mime.split('/')[1];
                  const imgPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`; // 图片存储路径
                  const imgURL = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`; // 图片存储的url
                  fs.writeFileSync(imgPath, file)
                  this.coverPath = imgPath;
                  this.coverURL = imgURL;
                  resolve(this)
                }
              }
              
              // 解压电子书
              try {
                this.unzip(); 
                this.parseContents(epub)
                  .then(({chapters, chapterTree}) => {
                    this.contents = chapters;
                    this.chapterTree = chapterTree;
                    epub.getImage(cover, handlerGetImage)
                  })
              } catch(e) {
                reject(e);
              }
            }
          }
        })
      }
    })
  }


  // 解压电子书
  unzip() {
    const admZip = require('adm-zip');
    const zip = new admZip(Book.genPath(this.path))
    zip.extractAllTo(Book.genPath(this.unzipPath), true)
  }
  
  // 解析电子书目录
  parseContents(epub) {
    // 获取toc文件的路径
    function getNcxFilePath() {
      const manifest = epub && epub.manifest;
      const spine = epub && epub.spine;
      const ncx = manifest && manifest.ncx;
      const toc = spine && spine.toc;
      return (ncx && ncx.href) || (toc && toc.href);
    }

    // 解析电子书目录
    function findParent(navPoint, level = 0, pid = '') {
      return navPoint.map(item => {
        item.level = level;
        item.pid = pid;
        // 存在二级目录
        if (item.navPoint && item.navPoint.length > 0) {
          item.navPoint = findParent(item.navPoint, level + 1, item['$'].id);
        } else if (item.navPoint) {
          item.level = level + 1;
          item.pid = item['$'].id;
        }

        return item;
      })
    }

    /**
     * flatten方法，将目录转为一维数组
     *
     * @param array
     * @returns {*[]}
     */
    function flatten(array) {
      return [].concat(...array).map(item => {
        if (item.navPoint && item.navPoint.length > 0) {
          return [].concat(item, flatten(item.navPoint));
        } else if (item.navPoint) {
          return item.concat(item, item.navPoint);
        }
        
        return item;
      })
      
    }
    

    const ncxFilePath = `${Book.genPath(this.unzipPath)}/${getNcxFilePath()}`;
   
    // 具体的业务逻辑
    if (!fs.existsSync(ncxFilePath)) {
      throw new Error('目录文件不存在');
    } else {
      return new Promise((resolve, reject) => {
        const xml = fs.readFileSync(ncxFilePath, 'utf-8');
        const dir = path.dirname(ncxFilePath).replace(`${UPLOAD_PATH}`, '')
        xml2js(xml, {
          // TODO 配置JSON解析去掉数组
          explicitArray: false,
          ignoreAttrs: false
        }, (err, ret) => {
          if (err) {
            reject(err)
          } else {
            const navMap = ret.ncx.navMap
            if (navMap && navMap.navPoint.length > 0) {
              navMap.navPoint = findParent(navMap.navPoint);
              const newNavMap = flatten(navMap.navPoint) // TODO 数组拍平，消除嵌套关系
              const chapters = [];
              // 如果目录大于从ncx解析出来的数量，则直接跳过
              newNavMap.forEach((chapter, index) => {
                const src = chapter.content['$'].src;
                console.log(chapter);
                chapter.text = `${UPLOAD_URL}${dir}/${src}`; // 生成章节的URL
                chapter.label = chapter.navLabel.text || '';
                chapter.navId = chapter['$'].id
                chapter.order = index + 1;
                chapter.fileName = this.fileName;
                chapters.push(chapter)
              })
              const chapterTree = [];
              chapters.forEach(c => {
                if (c.pid === '') {
                  chapterTree.push(c);
                } else {
                  const parent = chapters.find(_ => _.navId === c.pid);
                  parent.children.push(c);
                }
              })
              resolve({chapters, chapterTree})
            } else {
              reject(new Error('该图书没有目录'))
            }
          }
        })
      })
    }
  }

  
  static genPath(path) {
    if (path.startsWith('/')) {
      return path = `${UPLOAD_PATH}${path}`;
    } else {
      return path = `${UPLOAD_PATH}/${path}`;
    }
  }


  
}

module.exports = Book;