#!/bin/bash

devs=`fdisk -l | grep ^/dev/sd | sed 's/^\(\/dev\/sd..\).*$/\1/'`
gid=`cat /etc/group | grep ^users: | sed -e "s/[^:]\+:[^:]\+:\([^:]\+\).*/\1/g"`

for dev in ${devs[@]}
do
  blkid=`blkid ${dev}`
  name=`echo ${dev} | sed 's/^\/dev\///'`
  uuid=$( blkid --output value --match-tag UUID ${dev} )
  format=$( blkid --output value --match-tag TYPE ${dev} )
  fstype=${format},rw
  if [ "exfat" = "${format}" ]; then
    fstype=${fstype},gid=${gid}
  fi
  echo ${name} -fstype=${fstype} :UUID=${uuid}
done
