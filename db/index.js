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
const { reject } = require('lodash')

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

// 查询单个数据
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

// 通过用户编辑后的信息更新数据库存储对应的信息
function update(model, tableName, where) {
  return new Promise(async (resolve, reject) => {
    if (!isObject(model)) {
      reject(new Error('编辑的图书不合法'))
    } else {
      const sqlContent = [];
      Object.keys(model).forEach((item, index, arr) => {
        if (model.hasOwnProperty(item)) {
          sqlContent.push(item + ' = ');
          if (index === arr.length - 1) {
            sqlContent.push(`\'${model[item]}'`)
          } else {
            sqlContent.push(`\'${model[item] + '\', '}`)
          }
        }
      })
      let sql = `update \`${tableName}\` set ${sqlContent.join('')} ${where}`
      let res = await querySql(sql);
      res ? resolve(res) : reject(new Error('修改失败，请稍后重试'));
    }
  })
}

/**
 * 
 * @param {String} where 
 * @param {String} key 
 * @param {String} val 
 * @info 根据需要查找的条件来进行where拼接
 */
function and(where, key, val) {
  if (where === 'where') {
    return `where \`${key}\`='${val}'`;
  } else {
    return `${where} and \`${key}\`='${val}'`
  }
}

/**
 * 
 * @param {String} where 
 * @param {String} key 
 * @param {String} val 
 * @info 对关键字进行模糊查询
 */
function andLike(where, key, val) {
  if (where === 'where') {
    return `where \`${key}\`like '%${val}%'`;
  } else {
    return `${where} and \`${key}\` like '%${val}%'`
  }
}

module.exports = {
  connect,
  querySql,
  insert,
  queryOne,
  update,
  and,
  andLike
}