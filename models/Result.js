const {
  CODE_ERROR,
  CODE_SUCCESS
} = require('../utils/constant')

class Result {
  constructor(data, msg = '操作成功', options) {
    this.data = null
    if (arguments.length === 0) {
      this.msg = '操作成功'
    } else if (arguments.length === 1) {
      this.msg = data
    } else {
      this.data = data
      this.msg = msg
      if (options) {
        this.options = options
      }
    }
  }

  createResult(isPrint = true) {
    if (!this.code) {
      this.code = CODE_SUCCESS
    }
    let base = {
      code: this.code,
      msg: this.msg
    }
    if (this.data) {
      base.data = this.data
    }
    if (this.options) {
      base = { ...base, ...this.options }
    }
    if (isPrint) {
      console.log(base)
    }
    return base
  }

  json(res, isPrint) {
    res.json(this.createResult(isPrint))
  }

  success(res, isPrint) {
    this.code = CODE_SUCCESS
    this.json(res, isPrint)
  }

  fail(res) {
    this.code = CODE_ERROR
    this.json(res)
  }
}

module.exports = Result