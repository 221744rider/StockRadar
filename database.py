from sqlalchemy import create_engine,Column,String,Float,Date
from sqlalchemy.orm import declarative_base,sessionmaker
#1. 创建数据库链接
#这会在那你的文件夹里生成，stock_data.db 
engine=create_engine('sqlite:///stock_data.db',echo=True)
#2.创建一个“基类”，所有的表都要继承她
Base=declarative_base()
#3.定义一张表：叫“stock_prices”
class StockPrice(Base):
    __tablename__='stock_prices'
    #定义表里的列(相当于Excel的表头)
    #primary_key=True 表示唯一的身份
    id=Column(String,primary_key=True)
    symbol=Column(String) #股票代码
    date=Column(Date) #日期
    close=Column(Float)#收盘价 
    open=Column(Float)#开盘价
#4. 执行创建表命令(就像在excel新建一个Sheet)
Base.metadata.create_all(engine)
#5.创建一个会话工厂（用于后续存取数据）
SessionLocal=sessionmaker(bind=engine)
print(" 数据库和表结构已成功创建")