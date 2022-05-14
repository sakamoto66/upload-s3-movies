const fs = require('fs');
const path = require('path');
const glob = require("glob");
const { spawn, exec } = require('child_process')
require('date-utils');

function getMovieFiles(dir, absolute) {
  const files = glob.sync(`*.[Mm][Pp]4`, {cwd:dir, absolute:absolute})
  files.push(...glob.sync(`*.[Mm][Oo][Vv]`, {cwd:dir, absolute:absolute}))
  return files
}

function createConcatFileList(dir) {
  const fileList = `${dir}/files.txt`
  const files = getMovieFiles(dir, false)
  const stream = fs.createWriteStream(fileList)
  files.forEach(file => stream.write(`file ${file}\n`))
  stream.close()
  return fileList
}

exports.getMovieDirs = function (targetDir) {
  const dirs = glob.sync( `*/`, {cwd:targetDir, absolute:true} )
  return dirs.filter(dir => {
    const ptn1 = !fs.existsSync( `${dir}/files.txt` ) && 0 < getMovieFiles(dir, false).length
    const ptn2 = fs.existsSync( `${dir}/refiles.txt` )
    return ptn1 || ptn2
  })
}

exports.getParameters = function (dir, s3backet) {
  const ret = []
  const refiles = `${dir}/refiles.txt`
  const fileList = `${dir}/files.txt`
  if(fs.existsSync( refiles )) {
    fs.renameSync(refiles, fileList)
  } else {
    const movies = getMovieFiles(dir, false)
    const stream = fs.createWriteStream(fileList)
    const files = movies.map(file => {
      stream.write(`file ${file}\n`)
      return createCommandParam(dir, file, s3backet)
    })
    stream.close()

    ret.push(...files)
  }

  ret.push(createCommandParam(dir, 'files.txt', s3backet))

  return ret
}

function createCommandParam(dir, file, s3backet) {
  const localPath = `${dir}/${file}`
  const s3Path = `s3://${s3backet}/${path.basename(dir)}/${file}`
  const param = []
  param.push('s3')
  param.push('cp')
  param.push(localPath)
  param.push(s3Path)
  return param
}


exports.upload = function (dir, param) {
  const LOG = `${dir}/upload.log`  
  function log(msg) {
    const now = new Date().toFormat("YYYY/MM/DD HH24:MI:SS")
    msg.split("\n").forEach(line => {
      fs.appendFileSync(LOG, `${now} ${line}\n`)
    })
  }

  return new Promise(function (resolve, reject) {
    const s3Path = param[param.length-1]
    log(`start ${s3Path}`)
    const proc = spawn('aws', param)
    proc.stdout.on('data', (chunk) => console.log(chunk.toString()))
    proc.stderr.on('data', (chunk) => console.log(chunk.toString()))
  
    proc.on('close', (code) => {
      log(`close ${s3Path}`)
      resolve(code);
    })
    process.on('error', function (err) {
      log(`error ${s3Path}`)
      reject(err);
    })
  })
}
