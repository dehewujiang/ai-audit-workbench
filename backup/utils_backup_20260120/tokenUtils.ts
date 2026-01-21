
/**
 * 方案 PROF-2024-AFDP-001: 动态阈值定义
 */
export const THRESHOLDS = {
    L0_CLEAN: 32000,      // 清洗层：移除 <think> 标签
    L1_DISTILL: 64000,    // 提取层：执行 AFDP 协议特征总结
    L2_SKELETAL: 96000,   // 骨架层：抛弃细节，仅留结论
    MAX_BUDGET: 128000,   // 物理上限
};

/**
 * 估算 Token 消耗
 * 对中文环境：1汉字 ≈ 0.6-0.8 token。在此采取防御性保守算法（0.8）。
 * 对 JSON/代码：1字符 ≈ 0.3 token。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherCharCount = text.length - chineseCharCount;
  
  // 综合权估算
  return Math.ceil(chineseCharCount * 0.8 + otherCharCount * 0.4);
}

/**
 * 计算整个消息数组的 Token 总量
 */
export function calculateMessagesTokens(messages: any[]): number {
    return messages.reduce((sum, msg) => {
        const textTokens = estimateTokens(msg.content || msg.text || "");
        // 增加消息元数据的开销补偿
        return sum + textTokens + 20; 
    }, 0);
}
