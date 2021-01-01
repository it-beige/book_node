const {
  MEME_TYPE_EPUB,
  UPLOAD_PATH,
  UPLOAD_URL,
  UPDATE_TYPE_FROM_WEB,
  OLD_UPLOAD_URL
} = require('../utils/constant');
const fs = require('fs');
const Epub = require('../utils/epub');
const xml2js = require('xml2js').parseString
const path = require('path');

class Book {
  constructor(file, data) {
    if (file) {
      console.log('file------------>', file)
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
    this.fileName = data.fileName;
    this.originalName = data.originalName;
    this.path = data.path;
    this.filePath = data.filePath;
    this.title = data.title;
    this.author = data.author;
    this.publisher = data.publisher;
    this.cover = data.coverPath
    this.coverPath = data.coverPath;
    this.category = data.category || 99; // 分类ID
    this.creategoryText = data.creategoryText || '自定义'; // 分类
    this.language = data.language;
    this.rootFile = data.rootFile;
    this.unzipPath = data.unzipPath;
    this.createUser = data.username;
    this.contents = data.contents || [];
    this.createDt = new Date().getTime()
    this.updateDt = new Date().getTime()
    this.bookId = data.fileName;
    // 图片来源 0: 数据库上传 1: 用户上传
    this.updateType = data.updateType === 0 ? data.updateType : UPDATE_TYPE_FROM_WEB;
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
                  this.coverPath = `/img/${this.fileName}.${suffix}`
                  this.coverURL = imgURL;
                  resolve(this)
                }
              }
              
              // 解压电子书
              try {
                this.unzip(); 
                this.parseContents(epub)
                  .then(({chapters, contentsTree}) => {
                    this.contents = chapters;
                    this.contentsTree = contentsTree;
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
                chapter.href= `${dir}/${src}`.replace(this.unzipPath, '');
                chapter.id = `${src}`;
                chapter.text = `${UPLOAD_URL}${dir}/${src}`; // 生成章节的URL
                chapter.label = chapter.navLabel.text || '';
                chapter.navId = chapter['$'].id
                chapter.order = index + 1;
                chapter.fileName = this.fileName;
                chapters.push(chapter)
              })
              const contentsTree = Book.getContentsTree(chapters)
              resolve({chapters, contentsTree})
            } else {
              reject(new Error('该图书没有目录'))
            }
          }
        })
      })
    }
  }

  // 将字段和数据库进行对应
  toDb() {
    return {
      fileName: this.fileName,
      cover: this.cover,
      title: this.title,
      author: this.author,
      publisher: this.publisher,
      bookId: this.bookId,
      updateType: this.updateType,
      language: this.language,
      rootFile: this.rootFile,
      originalName: this.originalName,
      filePath: this.path,
      unzipPath: this.unzipPath,
      coverPath: this.coverPath,
      createUser: this.createUser,
      createDt: this.createDt,
      updateDt: this.updateDt,
      category: this.category || 99,
      categoryText: this.categoryText || '自定义'
    }
  }

  // 获取目录信息
  getContents() {
    return this.contents || []
  }

  
  // 移除目录中的文件
  reset() {
    console.log('reset------->', this);
    if (Book.pathExists(this.filePath)) {
      // 移除文件
      fs.unlinkSync(Book.genPath(this.path))
    }
    if (Book.pathExists(this.coverPath)) {
      fs.unlinkSync(Book.genPath(this.coverPath))
    }
    if (Book.pathExists(this.unzipPath)) {
      // 移除目录
      fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true })
    }
  }

  static genPath(path) {
    if (path.startsWith('/')) {
      return path = `${UPLOAD_PATH}${path}`
    } else {
      return path = `${UPLOAD_PATH}/${path}`
    }
  }

  static pathExists(path) {
    if (path.startsWith(UPLOAD_PATH)) {
      return fs.existsSync(path)
    } else {
      return fs.existsSync(Book.genPath(path))
    }
  }

  static getCoverUrl(book) {
    let { cover } = book;
    if (+book.updateType === 0) {
      if (cover) {
        return cover.startsWith('/') 
          ? `${OLD_UPLOAD_URL}${cover}`
          : `${OLD_UPLOAD_URL}/${cover}`
      } else {
        return null;
      }
    } else {
      if (cover) {
        return cover.startsWith('/') 
          ? `${UPLOAD_URL}${cover}`
          : `${UPLOAD_URL}/${cover}`
      } else {
        return null;
      }
    }
  }

  static getContentsTree(contents) {
    if (contents && contents.length > 0) {
      let contentsTree = [];
      
      contents.forEach(item => {
        // 用于存在当目录的子目录
        item.children = []
        if (item.pid === '') {  // 通过pid是否存在来判断当前目录是否存在子目录
          contentsTree.push(item);
        } else {
          let parent = contentsTree.find(_ => _.navId === item.pid);
          // 部分老图书会出现父目录和子目录id对不上的情况
          if (parent) {
            parent.children.push(item)
          }
        }
      })
      return contentsTree;
    } else {
      return null;
    }
  }
  
}

module.exports = Book;