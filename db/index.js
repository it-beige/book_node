const mysql = require('mysql')
const {debug} = require('../utils/env')
const {
  host,
  user,
  password,
  database
} = require('./config')
const { isObject } = require('../utils/index')
const Result = require('../models/Result')

// 链接数据库
function connect() {
  return mysql.createConnection({
    host,
    user,
    password,
    database,
    multipleStatements: true
  })
}

// sql查询封装
function querySql(sql) {
  const conn = connect()
  debug && console.log(sql)
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, (err, results) => {
        if (err) {
          debug && console.log('查询失败，原因:' + JSON.stringify(err))
          reject(err)
        } else {
          debug && console.log('查询成功', JSON.stringify(results))
          resolve(results)
        }
      })
    } catch (e) {
      reject(e)
    } finally {
      conn.end()
    }
  })
}


function queryOne(sql) {
  return new Promise((resolve, reject) => {
    querySql(sql)
      .then(results => {
        if (results && results.length > 0) {
          resolve(results[0])
        } else {
          resolve(null)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

// 插入数据
function insert(model, tableName) {
  return new Promise(async (resolve, reject) => {
    if (!isObject(model)) {
      reject(new Error('存储失败，放入的不是一个对象'));
    } else {
      const keys = [];
      const values = [];
      Object.keys(model).forEach(key => {
        // TODO keys会将原型上的成员, 可以使用Reflect.Ownkeys
        if (model.hasOwnProperty(key)) {
          keys.push(`\`${key}\``)
          values.push(`'${model[key]}'`)
        }
      })
      if (keys.length > 0 && values.length > 0) {
        let sql = `INSERT INTO \`${tableName}\`(`
        const keysString = keys.join(',')
        const valuesString = values.join(',')
        sql = `${sql}${keysString}) VALUES (${valuesString})`
        debug && console.log(sql);
        const conn = connect()
        try {
          conn.query(sql, (err, result) => {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } catch (e) {
          reject(e)
        } finally {
          conn.end()
        }
      } else {
        reject(new Error('SQL解析失败'))
      }
    }
  })
}

module.exports = {
  connect,
  querySql,
  insert,
  queryOne
}