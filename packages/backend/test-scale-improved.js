const axios = require('axios');

// 测试配置
const config = {
  baseURL: 'http://localhost:2999',
  testDuration: 90000, // 90秒测试时间
  lowLoadInterval: 2000, // 低负载请求间隔
  highLoadInterval: 200, // 高负载请求间隔（更合理）
  cpuDuration: 200, // CPU密集型任务持续时间（更短）
};

let completedRequests = 0;
let failedRequests = 0;
let startTime = Date.now();
let responseTimes = [];
let isHighLoad = false;

// 发送单个请求
async function sendRequest() {
  const requestStart = Date.now();
  try {
    const path = `/test/cpu?duration=${config.cpuDuration}`;
    const response = await axios.get(`${config.baseURL}${path}`, {
      timeout: 30000
    });
    
    completedRequests++;
    const responseTime = Date.now() - requestStart;
    responseTimes.push(responseTime);
    
    if (completedRequests % 50 === 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`[${new Date().toLocaleTimeString()}] 已完成 ${completedRequests} 个请求，平均响应时间: ${avgResponseTime.toFixed(2)}ms，当前负载: ${isHighLoad ? '高' : '低'}`);
    }
  } catch (error) {
    failedRequests++;
    if (failedRequests % 10 === 0) {
      console.error(`[${new Date().toLocaleTimeString()}] 已失败 ${failedRequests} 个请求:`, error.message);
    }
  }
}

// 切换负载模式
function toggleLoadMode() {
  isHighLoad = !isHighLoad;
  const mode = isHighLoad ? '高负载' : '低负载';
  const interval = isHighLoad ? config.highLoadInterval : config.lowLoadInterval;
  console.log(`\n[${new Date().toLocaleTimeString()}] ========== 切换到${mode}模式，请求间隔: ${interval}ms ==========\n`);
  return interval;
}

// 启动测试
async function startTest() {
  console.log('===== 改进后的扩容缩容测试 =====');
  console.log(`测试时长: ${config.testDuration / 1000}秒`);
  console.log(`低负载请求间隔: ${config.lowLoadInterval}ms`);
  console.log(`高负载请求间隔: ${config.highLoadInterval}ms`);
  console.log(`CPU任务持续时间: ${config.cpuDuration}ms`);
  console.log('====================\n');
  
  startTime = Date.now();
  let currentInterval = config.lowLoadInterval;
  let intervalId = null;
  
  // 初始启动低负载模式
  console.log(`[${new Date().toLocaleTimeString()}] ========== 初始低负载模式，请求间隔: ${config.lowLoadInterval}ms ==========\n`);
  intervalId = setInterval(sendRequest, currentInterval);
  
  // 20秒后切换到高负载模式（观察扩容）
  setTimeout(() => {
    clearInterval(intervalId);
    currentInterval = toggleLoadMode();
    intervalId = setInterval(sendRequest, currentInterval);
  }, 20000);
  
  // 60秒后切换到低负载模式（观察缩容）
  setTimeout(() => {
    clearInterval(intervalId);
    currentInterval = toggleLoadMode();
    intervalId = setInterval(sendRequest, currentInterval);
  }, 60000);
  
  // 等待测试完成
  await new Promise(resolve => setTimeout(resolve, config.testDuration));
  
  // 清理
  clearInterval(intervalId);
  
  // 等待最后请求完成
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 计算统计数据
  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const medianResponseTime = sortedResponseTimes.length > 0 ? sortedResponseTimes[Math.floor(sortedResponseTimes.length / 2)] : 0;
  
  console.log('\n===== 测试完成 =====');
  console.log(`总请求数: ${completedRequests + failedRequests}`);
  console.log(`成功请求数: ${completedRequests}`);
  console.log(`失败请求数: ${failedRequests}`);
  console.log(`成功率: ${((completedRequests / (completedRequests + failedRequests)) * 100).toFixed(2)}%`);
  console.log(`总耗时: ${duration}ms`);
  console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${minResponseTime}ms`);
  console.log(`最大响应时间: ${maxResponseTime}ms`);
  console.log(`中位数响应时间: ${medianResponseTime}ms`);
  console.log(`QPS: ${(completedRequests / (duration / 1000)).toFixed(2)}`);
}

// 启动测试
startTest();
