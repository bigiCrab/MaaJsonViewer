# MaaPipelineViewer

就是用来编辑 pipeline 的小玩意

## setup

- 使用 node 18
- nvm 要支援 workspace

```shell
python scripts/build.py
```

## note

- [ ] fix: 不支援 maa提供的操作/截圖api 的問題
- [ ] fix: /eval 執行任務時失敗 會連不上模擬器 需要重開server+模擬器
- [ ] feat: /edit 不能刪文件夾
- [ ] feat: recognition 支援 color match
- [ ] improve: ws 輸出影像到 web 效能太差常斷線
