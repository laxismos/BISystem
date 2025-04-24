<script setup lang="ts">
import { ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElNotification, type UploadProps, type UploadUserFile, type UploadInstance } from 'element-plus'
import axios from 'axios'
import ExcelJS from 'exceljs'

interface PredictData {
  date: Date | string,
  image_name: string,
  content: string,
  type: string,
  extra_data?: string
}

interface CachedImage {
    name: string,
    url?: string
}

interface ResponseType {
    name: string,
    result: string,
    type: string
}

interface KV {
    [key: string]: string
}

const predictResult = ref<PredictData[]>([])
const imgList = ref<UploadUserFile[]>([])
const selectedOptions = ref<string[]>([])
const cachedImages = ref<CachedImage[]>([])
const typeMapper: KV = {'floors': '楼层数识别', 'add': '加层分析', 'material': '材质识别', 'hidden': '隐患检测'}

const sampleImageList = [
  {'url': '/valid_sample.jpg', desc:'楼层识别图像示例-1'},
  {'url': '/valid_sample2.jpg', desc:'楼层识别图像示例-2'}
]
const picShowValue = ref('示例图片')
const picShowValueList = ['示例图片', '已选择']
const onLoading = ref(false)
const uploadRef = ref<UploadInstance>() 

const beforeUpload = (file: UploadUserFile) => {
  let raw = file.raw
  if (raw) {
    const isFileTypeOK = raw.type === 'image/jpg' || raw.type === 'image/jpeg' || raw.type === 'image/png'
    const isSizeOK = raw.size / 1024 / 1024 < 5
    if (!isFileTypeOK) {
      ElNotification({
        title: '错误',
        message: '不接受的图片类型！',
        type: 'error',
        duration: 1500
      })
      return false
    }
    if (!isSizeOK) {
      ElNotification({
        title: '错误',
        message: '超过图片尺寸限制！',
        type: 'error',
        duration: 1500
      })
      return false
    }
    return true
  }
}

const handleUploadChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  imgList.value = uploadFiles
  console.log(uploadFile, uploadFiles)
  cachedImages.value.length = 0
  for (let i=0; i<uploadFiles.length; i++) {
    cachedImages.value.push({name:uploadFiles[i].name, url:uploadFiles[i].url})
  }
  picShowValue.value = picShowValueList[1]
}

const checkFilesExist = () => {
  if (imgList.value.length == 0) {
    ElNotification({
      title: '错误',
      message: '未选择图片！',
      type: 'error',
      duration: 1500
    })
    return false
  }
  return true
}

const checkOptions = () => {
  if (selectedOptions.value.length == 0) {
    ElNotification({
      title: '错误',
      message: '请选择至少一个选项！',
      type: 'error',
      duration: 1500
    })
    return false
  }
  return true
}

const tryToPredict = (event: Event) => {
  if (event) {
    if (checkFilesExist() && checkOptions()) {
      onLoading.value = true
      let form = new FormData()
      for (let index=0; index<imgList.value.length; index++) {
        let file = imgList.value[index].raw
        if (file) {
          form.append('options', JSON.stringify(selectedOptions.value))
          form.append('image', file)
        } else {
          ElNotification({
            title: '错误',
            message: '文件不存在！',
            type: 'error',
            duration: 1500
          })
          return
        }
    }
    axios.post('http://127.0.0.1:8000/building/', form, {
        headers: {
        "Content-Type": "multipart/form-data"
        }
    }).then(response => {
        console.log("上传完成", response.data)
        ElNotification({
            title: '完成',
            message: '识别完成！',
            type: 'success',
            duration: 1500
        })
        let _data = response.data
        let _content: ResponseType[] = _data['content']
        
        for (let i=0; i<_content.length; i++) {
            let res = _content[i]
            predictResult.value.push({date: (new Date()).toLocaleDateString(), content: res['result'], type:typeMapper[res['type']], image_name:res['name']})
        }
    }).catch(error => {
        console.log(error)
        ElNotification({
            title: '错误',
            message: '识别失败！',
            type: 'error',
            duration: 1500
        })
    }).finally(() => {
        onLoading.value = false
    })
    }
  }
}

const deleteRow = (index: number) => {
    imgList.value.splice(index, 1)
    cachedImages.value.splice(index, 1)
}

const tableRowClassName = ({
    row,
    rowIndex
}:{
    row: PredictData,
    rowIndex: number
}) => {
    if (row.type === '楼层数识别') {
      return 'floors-row'
    } else if(row.type === '加层分析') {
      return 'add-row'
    } else if(row.type === '材质识别') {
      return 'material-row'
    } else {
      console.log(rowIndex)
      return 'risk-row'
    }
}

const writeToExcel = () => {

}
</script>

<template>
    <div class="container">
        <el-row :gutter="20">
            <el-col :span="6">
                <div style="height: 48%;  margin-bottom: 20px;">
                    <el-card class="upload-card">
                        <div style="text-align: left; width: 100%; font-weight: bold; margin-bottom: 20px;">上传</div>
                        <el-upload
                            ref="uploadRef"
                            v-model:file-list="imgList"
                            class="upload-demo"
                            drag
                            action="#"
                            :auto-upload="false"
                            list-type="picture"
                            accept="image/jpeg, image/png"
                            :show-file-list="false"
                            :before-upload="beforeUpload"
                            :on-change="handleUploadChange"
                            :multiple="true"
                        >
                            <div class="el-upload__text">
                                拖拽图片到此处或 <em>点击上传</em>
                            </div>
                            <template #tip>
                                <div class="el-upload__tip">
                                    支持格式：JPEG/PNG，最大5MB
                                </div>
                            </template>
                        </el-upload>
                        <el-button type="success" style="margin-top: 30px; width: 100%;">
                            上传文件夹
                        </el-button>
                    </el-card>
                </div>
                <div style="height: 50%;">
                    <el-card class="task-card">
                        <div style="text-align: left; width: 100%; font-weight: bold;">任务</div>
                        <div class="analysis-options">
                            <el-checkbox-group v-model="selectedOptions" :disabled="onLoading">
                                <el-col style="padding-top: 20px;">
                                    <el-row>
                                        <el-checkbox label="floorCount" value="floors" size="large" style="width: 40%;">
                                            <el-text class="mx-1" size="large" style="font-weight: bold; color:darkgray;">楼层数识别</el-text>
                                        </el-checkbox>
                                        <el-checkbox label="addFloor" value="add" size="large" style="width: 40%;">
                                            <el-text class="mx-1" size="large" style="font-weight: bold; color:#67C23A;">加层分析</el-text>
                                        </el-checkbox>
                                    </el-row>
                                    <el-row>
                                        <el-checkbox label="materials" value="material" size="large" style="width: 40%;">
                                            <el-text class="mx-1" size="large" style="font-weight: bold; color:#E6A23C;">建筑材质识别</el-text>
                                        </el-checkbox>
                                        <el-checkbox label="hidden_danger" value="hidden" size="large" style="width: 40%;">
                                            <el-text class="mx-1" size="large" style="font-weight: bold; color:#F56C6C;">安全隐患检测</el-text>
                                        </el-checkbox>
                                    </el-row>
                                </el-col>
                            </el-checkbox-group>
                        </div>
                        <el-col>
                            <el-button 
                                type="primary" 
                                size="large" 
                                class="analyze-btn"
                                @click="tryToPredict"
                            >
                                开始分析
                            </el-button>
                            <el-button
                                type="success"
                                size="large"
                                class="export-btn"
                            >
                                导出为Excel
                            </el-button>    
                        </el-col>
                        
                    </el-card>
                </div>
            </el-col>
            <el-col :span="8" style="height: 900px;">
                <div style="height: 100%;">
                    <el-card class="example-card">
                        <template #header>
                            <div class="card-header">
                                <el-segmented v-model="picShowValue" :options="picShowValueList" block size="large"/>
                            </div>
                        </template>
                        <el-carousel v-if="picShowValue == '示例图片'" height="800px" indicator-position="none">
                            <el-carousel-item v-for="img in sampleImageList">
                                <el-image style="width: 92%;" :src="img.url" fit="cover" />
                                <p>{{ img.desc }}</p>
                            </el-carousel-item>
                        </el-carousel>
                        <div v-else>
                            <el-empty v-if="imgList.length == 0" description="暂无图片" />
                            <el-table v-else :data="cachedImages" :show-header="false" height="400px">
                                <el-table-column width="120">
                                    <template #default="scope">
                                        <el-image preview-teleported :src="scope.row.url" />
                                    </template>
                                </el-table-column>
                                <el-table-column prop="name" width="240"/>
                                <el-table-column fixed="right">
                                    <template #default="scope">
                                        <el-button @click.prevent="deleteRow(scope.$index)" style="border: none;"><el-icon><Delete /></el-icon></el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                    </el-card>
                </div>
            </el-col>
            <el-col :span="10">
                <div style="height: 100%;">
                    <el-card class="result-card">
                        <template #header style="width: 100%;">
                            <div style="width: 100%; text-align: left; font-weight: bold;">结果展示</div>
                        </template>
                        <el-empty v-if="predictResult.length == 0" description="暂无结果" />
                        <el-table v-else :data="predictResult" :row-class-name="tableRowClassName" height="800px">
                            <el-table-column type="index" label="序号" width="80" />
                            <el-table-column prop="image_name" label="图片名称" width="320" />
                            <el-table-column prop="content" label="结果" width="120"/>
                            <el-table-column prop="type" label="任务类型" width="120" sortable />
                            <el-table-column prop="date" label="识别日期" sortable />
                        </el-table>
                    </el-card>
                </div>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped>
.container {
  max-width: 2400px;
  margin: auto;
  margin-top: 10px;
  padding: 0;
}

.upload-card {
  margin-bottom: 20px;
  background-color:aliceblue;
  height: 100%; 
  border-radius: 12px;
}

.task-card {
    height: 100%; 
    border-radius: 12px;
}

.example-card {
    border-radius: 12px;
    height: 100%;
}

.result-card {
    width: 100%; 
    border-radius: 12px;
    height: 900px;
}

.analyze-btn {
    border-radius: 24px;
    width: 100%;
    margin-top: 30px;
}

.export-btn {
    border-radius: 24px;
    width: 100%;
    margin: auto;
    margin-top: 30px;
    
}

.uploader {
  :deep(.el-upload-dragger) {
    padding: 40px 20px;
  }
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.custom-style .el-segmented {
  --el-segmented-item-selected-color: var(--el-text-color-primary);
  --el-segmented-item-selected-bg-color: #409EFF;
  --el-border-radius-base: 16px;
}
</style>
<style>
.el-table .floors-row {
    --el-table-tr-bg-color: rgb(230, 230, 230);
}
.el-table .add-row {
    --el-table-tr-bg-color: #d4f5c4;
}
.el-table .material-row {
    --el-table-tr-bg-color: #f5e5ce;
}
.el-table .risk-row {
    --el-table-tr-bg-color: #f8cccc;
}
</style>