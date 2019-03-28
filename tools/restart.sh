mv logs/out.log.txt logs/out.$(date -d "today" +"%Y%m%d_%H%M%S").txt
mv logs/err.log.txt logs/err.$(date -d "today" +"%Y%m%d_%H%M%S").txt
ps aux | grep "PetBCserver.js" | grep -v grep | awk '{print $2}' | xargs kill
sleep 1
nohup node PetBCserver.js 1>logs/out.log.txt 2>logs/err.log.txt &