const { read } = require('fs');
const Redis = require('ioredis'); 

//Name of stream we are reading from
const STREAM_KEY = 'venus'
//Interval of the stream we are processing to determine the "real-time" statistics
const INTERVAL = 300000;
//Rate at which we want to query the stream for data
const PING_RATE = 3000; 
//Where Redis is being hosted (either local machine or elasticache)
const REDIS_HOST = 'venus-redis-micro.syohjt.ng.0001.use2.cache.amazonaws.com'

const redis = new Redis({
  port: 6379, 
  host: REDIS_HOST
});

console.log(`Reading the stream named ${STREAM_KEY}...`); 

const readRedisStream = async () => {

  //Get the milliseconds for start and end time
  const startTime = Date.now() - INTERVAL; 
  const endTime = startTime + INTERVAL;  

  //Transform xrange's output from two arrays of keys and value into one array of log objects
  Redis.Command.setReplyTransformer('xrange', function (result) {
    if(Array.isArray(result)){
      const newResult = []; 
      for(const r of result){
        const obj = {
          id: r[0]
        }; 

        const fieldNamesValues = r[1]; 

        for(let i = 0; i < fieldNamesValues.length; i += 2){
          const k = fieldNamesValues[i]; 
          const v = fieldNamesValues[i + 1]; 
          obj[k] = v; 
        }

        newResult.push(obj); 
      }

      return newResult; 
    }

    return result; 
  }); 

  streamEntries = await redis.xrange(STREAM_KEY, startTime, endTime); 

  console.log('XRANGE, response with reply transformer'); 
  //real-time entries should be sent for processing elsewhere 
  console.log(streamEntries); 

}

try {
  setInterval(async () => { await readRedisStream()}, PING_RATE); 
} catch (e) {
  console.error(e); 
}