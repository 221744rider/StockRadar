import akshare as ak
import pandas as pd
from datetime import datetime
from database import SessionLocal, StockPrice  # 导入我们刚才写好的数据库工具

def save_stock_to_db(symbol):
    print(f"🚀 开始处理 {symbol} ...")

    # 1. 创建数据库会话 (相当于打开数据库文件的“读写通道”)
    db = SessionLocal()

    try:
        # 2. 抓取数据 (和之前一样)
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date="20250101", adjust="qfq")
        
        if df.empty:
            print("❌ 未获取到数据")
            return

        print(f"✅ 成功获取 {len(df)} 条数据，准备写入数据库...")

        # 3. 循环每一行数据，把它变成数据库能认的格式
        for index, row in df.iterrows():
            date_str = str(row['日期'])
            
            # 生成一个唯一的 ID，防止重复写入
            # 格式举例：2026-01-28_600519
            unique_id = f"{date_str}_{symbol}"

            # 创建一个“股票价格对象”
            price_record = StockPrice(
                id=unique_id,
                symbol=symbol,
                date=datetime.strptime(date_str, "%Y-%m-%d").date(), # 把字符串转成日期对象
                open=row['开盘'],
                close=row['收盘']
            )

     # 4. 合并数据
            # merge 的作用是：如果数据库里已经有这个 ID，就更新它；如果没有，就插入它。
            # 这样你多次运行脚本也不会导致数据重复！
            db.merge(price_record)
        
        # 5. 提交保存 (相当于点击 Excel 的保存按钮)
        db.commit()
        print(f"🎉 成功保存 {symbol} 的数据到 stock_data.db！")

    except Exception as e:
        print(f"💥 发生错误: {e}")
        db.rollback() # 如果出错，回滚（撤销）刚才的操作，保持数据库干净
    finally:
        db.close() # 记得关门

if __name__ == "__main__":
    # 让我们存一下“贵州茅台”的数据
    save_stock_to_db("600519")
