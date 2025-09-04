/**
 * API兼容性处理器测试套件
 * 全面测试不同API版本的兼容性处理能力
 */

const { ApiResponseValidator, VuePressApiHandler } = require('./apiResponseHandler');
const { VuePressAiPlugin } = require('./vuepressAiPlugin');

/**
 * API兼容性测试套件
 */
class ApiCompatibilityTestSuite {
  constructor() {
    this.validator = new ApiResponseValidator();
    this.apiHandler = new VuePressApiHandler();
    this.aiPlugin = new VuePressAiPlugin({ enableDebug: true });
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始API兼容性测试...\n');

    // 测试1: 基础字段验证
    await this.testBasicValidation();

    // 测试2: 字段映射功能
    await this.testFieldMapping();

    // 测试3: 嵌套字段提取
    await this.testNestedFieldExtraction();

    // 测试4: 缺失字段处理
    await this.testMissingFieldHandling();

    // 测试5: 不同API版本兼容性
    await this.testApiVersionCompatibility();

    // 测试6: 降级响应处理
    await this.testFallbackResponse();

    // 测试7: VuePress插件集成
    await this.testVuePressIntegration();

    // 生成最终报告
    this.generateFinalReport();
  }

  /**
   * 测试1: 基础字段验证
   */
  async testBasicValidation() {
    console.log('📋 测试1: 基础字段验证');
    
    try {
      const testResponse = {
        content: '这是测试内容',
        id: 'test123',
        timestamp: new Date().toISOString()
      };

      const result = this.validator.validateAndNormalize(testResponse, ['content']);
      
      if (result.content === '这是测试内容' && result.id === 'test123') {
        console.log('✅ 基础字段验证通过');
        this.testResults.push({ test: 'basicValidation', status: 'pass' });
      } else {
        throw new Error('字段值不匹配');
      }
    } catch (error) {
      console.log('❌ 基础字段验证失败:', error.message);
      this.testResults.push({ test: 'basicValidation', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试2: 字段映射功能
   */
  async testFieldMapping() {
    console.log('📋 测试2: 字段映射功能');
    
    try {
      const testResponse = {
        text: '映射测试内容', // content的映射
        messageId: 'mapped123', // id的映射
        created_at: new Date().toISOString() // timestamp的映射
      };

      const result = this.validator.validateAndNormalize(testResponse, ['content']);
      
      if (result.content === '映射测试内容' && result.id === 'mapped123') {
        console.log('✅ 字段映射功能正常');
        this.testResults.push({ test: 'fieldMapping', status: 'pass' });
      } else {
        throw new Error('字段映射失败');
      }
    } catch (error) {
      console.log('❌ 字段映射测试失败:', error.message);
      this.testResults.push({ test: 'fieldMapping', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试3: 嵌套字段提取
   */
  async testNestedFieldExtraction() {
    console.log('📋 测试3: 嵌套字段提取');
    
    try {
      const testResponse = {
        data: {
          message: '嵌套内容测试',
          metadata: {
            id: 'nested123',
            timestamp: new Date().toISOString()
          }
        }
      };

      // 扩展字段映射以支持嵌套路径
      this.validator.fieldMappings.content.push('data.message');
      this.validator.fieldMappings.id.push('data.metadata.id');
      
      const result = this.validator.validateAndNormalize(testResponse, ['content']);
      
      if (result.content === '嵌套内容测试' && result.id === 'nested123') {
        console.log('✅ 嵌套字段提取成功');
        this.testResults.push({ test: 'nestedExtraction', status: 'pass' });
      } else {
        throw new Error('嵌套字段提取失败');
      }
    } catch (error) {
      console.log('❌ 嵌套字段提取失败:', error.message);
      this.testResults.push({ test: 'nestedExtraction', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试4: 缺失字段处理
   */
  async testMissingFieldHandling() {
    console.log('📋 测试4: 缺失字段处理');
    
    try {
      const testResponse = {
        content: '部分字段响应'
        // 故意缺少 id 和 timestamp
      };

      const result = this.validator.validateAndNormalize(testResponse, ['content', 'id']);
      
      if (result.content === '部分字段响应' && 
          result.id && result.id.startsWith('fallback-') &&
          result._validation.issues.length > 0) {
        console.log('✅ 缺失字段处理正确，已填充默认值');
        console.log(`   生成的备用ID: ${result.id}`);
        this.testResults.push({ test: 'missingFieldHandling', status: 'pass' });
      } else {
        throw new Error('缺失字段处理异常');
      }
    } catch (error) {
      console.log('❌ 缺失字段处理失败:', error.message);
      this.testResults.push({ test: 'missingFieldHandling', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试5: 不同API版本兼容性
   */
  async testApiVersionCompatibility() {
    console.log('📋 测试5: 不同API版本兼容性');
    
    const apiVersions = [
      // 版本1
      { content: 'v1内容', id: 'v1_123', model: 'model-v1' },
      // 版本2 
      { text: 'v2内容', messageId: 'v2_456', model_name: 'model-v2' },
      // 版本3
      { response: 'v3内容', uuid: 'v3_789', version: 'model-v3' }
    ];

    try {
      let passCount = 0;
      
      for (let i = 0; i < apiVersions.length; i++) {
        const result = this.apiHandler.handleApiResponse(apiVersions[i], {
          requiredFields: ['content'],
          enableLogging: false
        });
        
        if (result.content && result.id) {
          passCount++;
          console.log(`✅ API版本${i + 1}兼容性测试通过`);
        } else {
          console.log(`❌ API版本${i + 1}兼容性测试失败`);
        }
      }

      if (passCount === apiVersions.length) {
        this.testResults.push({ test: 'apiVersionCompatibility', status: 'pass' });
      } else {
        this.testResults.push({ 
          test: 'apiVersionCompatibility', 
          status: 'partial', 
          details: `${passCount}/${apiVersions.length} passed` 
        });
      }
    } catch (error) {
      console.log('❌ API版本兼容性测试失败:', error.message);
      this.testResults.push({ test: 'apiVersionCompatibility', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试6: 降级响应处理
   */
  async testFallbackResponse() {
    console.log('📋 测试6: 降级响应处理');
    
    try {
      // 测试无效响应
      const invalidResponses = [null, undefined, '', 123, []];
      let fallbackCount = 0;

      for (const invalidResponse of invalidResponses) {
        const result = this.apiHandler.handleApiResponse(invalidResponse);
        if (result.content.includes('抱歉') && result.error) {
          fallbackCount++;
        }
      }

      if (fallbackCount === invalidResponses.length) {
        console.log('✅ 降级响应处理正确');
        this.testResults.push({ test: 'fallbackResponse', status: 'pass' });
      } else {
        throw new Error('部分降级响应处理失败');
      }
    } catch (error) {
      console.log('❌ 降级响应处理失败:', error.message);
      this.testResults.push({ test: 'fallbackResponse', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 测试7: VuePress插件集成
   */
  async testVuePressIntegration() {
    console.log('📋 测试7: VuePress插件集成');
    
    try {
      // 模拟多次API调用
      const testMessages = [
        '测试消息1',
        '测试消息2', 
        '测试消息3'
      ];

      for (const message of testMessages) {
        await this.aiPlugin.sendMessage(message);
      }

      const stats = this.aiPlugin.getStats();
      
      if (stats.totalRequests === 3 && stats.successfulRequests > 0) {
        console.log('✅ VuePress插件集成测试通过');
        console.log(`   总请求: ${stats.totalRequests}`);
        console.log(`   成功率: ${stats.successRate}`);
        console.log(`   兼容性问题率: ${stats.compatibilityRate}`);
        this.testResults.push({ test: 'vuepressIntegration', status: 'pass', stats });
      } else {
        throw new Error('插件统计数据异常');
      }
    } catch (error) {
      console.log('❌ VuePress插件集成测试失败:', error.message);
      this.testResults.push({ test: 'vuepressIntegration', status: 'fail', error: error.message });
    }
    console.log('');
  }

  /**
   * 生成最终测试报告
   */
  generateFinalReport() {
    console.log('📊 API兼容性测试报告');
    console.log('=' .repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'pass').length;
    const failedTests = this.testResults.filter(r => r.status === 'fail').length;
    const partialTests = this.testResults.filter(r => r.status === 'partial').length;

    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`部分通过: ${partialTests}`);
    console.log(`成功率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    console.log('');

    // 详细结果
    console.log('📋 详细测试结果:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'pass' ? '✅' : 
                    result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.details) {
        console.log(`   详情: ${result.details}`);
      }
    });
    console.log('');

    // 生成建议
    console.log('💡 优化建议:');
    if (failedTests > 0) {
      console.log('- 检查失败的测试用例，确保API响应处理逻辑正确');
    }
    if (partialTests > 0) {
      console.log('- 完善部分通过的测试用例，提高兼容性覆盖率');
    }
    console.log('- 定期运行兼容性测试，确保新版本API的稳定性');
    console.log('- 监控生产环境中的API兼容性问题，及时调整字段映射');

    // 保存报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        partial: partialTests,
        successRate: `${(passedTests / totalTests * 100).toFixed(1)}%`
      },
      testResults: this.testResults,
      recommendations: [
        '定期运行兼容性测试',
        '监控API版本变化',
        '完善字段映射机制'
      ]
    };

    const fs = require('fs');
    fs.writeFileSync('./api-compatibility-report.json', JSON.stringify(report, null, 2));
    console.log('\n📋 完整报告已保存到: api-compatibility-report.json');
  }
}

// 主函数
async function main() {
  const testSuite = new ApiCompatibilityTestSuite();
  await testSuite.runAllTests();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ApiCompatibilityTestSuite };