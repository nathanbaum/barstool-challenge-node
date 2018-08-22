if [ ! -d "./dblogs" ]; then
  mkdir ./dblogs
fi
mongod --fork --logpath ./dblogs/mongolog --port 27017
node ./src/app.js

#PID = $!
#echo $PID > .processes
#disown $PID
exit 0
