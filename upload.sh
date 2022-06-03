#!/bin/bash

uploads=`find ${1} -name upload`
s3path=$2

for upload in ${uploads[@]}
do
  target=$(dirname ${upload})
  npm run make ${target} ${s3path}
done