#!/bin/bash
sudo su

count=`ps aux | grep "grabber.js" | grep -v "grep" | wc -l`

if [ $count -lt 1 ]; then
    #Çå¿Õlog
    #> /data/app.log
    nohup node ./grabber.js 1>./logs/out.log.txt 2>./logs/err.log.txt &
    echo "start grabber ..."
fi
