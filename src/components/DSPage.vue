<script setup lang="ts">
import { Ref, ref } from 'vue'
import { ElNotification, type UploadProps, type UploadUserFile, type CollapseModelValue, type UploadInstance } from 'element-plus'
import axios from 'axios'

const selectedOptions = ref<string[]>([])
const isAnalyzing = ref(false)
const activeNames = ref('')
const imgList = ref<UploadUserFile[]>([])
const uploadRef = ref<UploadInstance>()
const addKeyWord = ["无加层", "有加层"]
const onLoading = ref(false)
var onSendingCnt = 0

interface PredictData{
  date: Date | string,
  image_name: string,
  content: string,
  type: string,
  extra_data?: string
}

type RSM = {
  [key: string]: Ref<PredictData[]>
}

const floorsResult = ref<PredictData[]>([])
const addResult = ref<PredictData[]>([])
const materialResult = ref<PredictData[]>([])
const riskResult = ref<PredictData[]>([])
const resultMapper:RSM = {'floors': floorsResult, 'add': addResult, 'material': materialResult, 'hidden': riskResult}
const sampleImageList = [
  {'url': '/valid_sample.jpg', desc:'楼层识别图像示例-1'},
  {'url': '/valid_sample2.jpg', desc:'楼层识别图像示例-2'}
]

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
}

const handleCollapseChange = (val: CollapseModelValue) => {
  console.log(val)
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

const addRemap = () => {
  for (let i=0; i < addResult.value.length; i++) {
    let k = parseInt(addResult.value[i]['content'])
    if (!Number.isNaN(k)) {
      addResult.value[i]['content'] = addKeyWord[k]
    }
  }
}

const tryToPredict = (event: Event) => {
  if (event) {
    if (checkFilesExist() && checkOptions()) {
      onLoading.value = true
      for (let index=0; index<imgList.value.length; index++) {
        let form = new FormData()
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
        onSendingCnt += 1
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
          let _content = _data['content']
          console.log(_content)
          for (let j=0; j < selectedOptions.value.length; j++) {
            let key: string = selectedOptions.value[j]
            resultMapper[key].value.push({date: (new Date()).toLocaleString(), image_name:_data['image_name'], content:_content[key], type:key})
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
          onSendingCnt -= 1
          if (onSendingCnt == 0) {
            onLoading.value = false
            uploadRef.value?.clearFiles()
            if ('add' in selectedOptions.value) {
              addRemap()
            }
          }
        })
      }
    }
  }
}

</script>

<template>
  <div class="container">
    <el-card class="meta-card">
      <p>提示：上传的图片应该是正面、无遮挡的，需要确保图像的清晰度，不合条件的图片会影响各项识别的正确率。各项识别的要求可以参照示例图片。</p>
    </el-card>

    <el-row :gutter="20" class="main-content">
      <el-col :md="12" :sm="24">
        <el-card class="upload-card">
          <el-upload
            ref="uploadRef"
            v-model:file-list="imgList"
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :before-upload="beforeUpload"
            :on-change="handleUploadChange"
            list-type="picture"
            accept="image/jpeg, image/png"
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
        </el-card>

        <el-card class="example-card" style="margin-bottom: 20px;">
          <template #header>
            <div class="card-header">
              <span>示例图片</span>
            </div>
          </template>
          <el-carousel height="600px">
            <el-carousel-item v-for="img in sampleImageList">
              <el-image style="width: 72%; max-height: 800px;" :src="img.url" fit="scale-down"/>
              <p>{{ img.desc }}</p>
            </el-carousel-item>
          </el-carousel>

        </el-card>
      </el-col>

      <el-col :md="12" :sm="24">
        <el-card class="analysis-card">
          <template #header>
            <div class="card-header">
              <span>任务</span>
            </div>
          </template>

          <div class="analysis-options">
            <el-checkbox-group v-model="selectedOptions" :disabled="onLoading">
              <el-checkbox label="floorCount" value="floors" size="large">
                <el-text class="mx-1" size="large" style="font-weight: bold; color:darkgray;">楼层数识别</el-text>
              </el-checkbox>
              <el-checkbox label="addFloor" value="add" size="large">
                <el-text class="mx-1" size="large" style="font-weight: bold; color:#67C23A;">加层分析</el-text>
              </el-checkbox>
              <el-checkbox label="materials" value="material" size="large">
                <el-text class="mx-1" size="large" style="font-weight: bold; color:#E6A23C;">建筑材质识别</el-text>
              </el-checkbox>
              <el-checkbox label="hidden_danger" value="hidden" size="large">
                <el-text class="mx-1" size="large" style="font-weight: bold; color:#F56C6C;">安全隐患检测</el-text>
              </el-checkbox>
            </el-checkbox-group>
          </div>

          <el-button 
            type="primary" 
            size="large" 
            :loading="isAnalyzing"
            class="analyze-btn"
            @click="tryToPredict"
            :disabled="onLoading"
          >
            开始分析
          </el-button>
        </el-card>

        <el-card class="result-card">
          <template #header>
            <div class="card-header">
              <span>结果展示</span>
            </div>
          </template>
          <el-collapse v-model="activeNames" @change="handleCollapseChange">
            <el-collapse-item title="楼层数">
              <el-table :data="floorsResult">
                <el-table-column type="index" label="序号" width="60" />
                <el-table-column prop="date" label="识别日期" width="180" />
                <el-table-column prop="image_name" label="图片名称" width="160" />
                <el-table-column prop="content" label="层数" width="60" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="加层状况">
              <el-table :data="addResult">
                <el-table-column type="index" label="序号" width="60" />
                <el-table-column prop="date" label="识别日期" width="200" />
                <el-table-column prop="image_name" label="图片名称" width="200" />
                <el-table-column prop="content" label="加层状况" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="材质">
              <el-table :data="materialResult">
                <el-table-column type="index" label="序号" width="60" />
                <el-table-column prop="date" label="识别日期" width="200" />
                <el-table-column prop="image_name" label="图片名称" width="200" />
                <el-table-column prop="content" label="建筑材质" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="隐患">
              <el-table :data="riskResult">
                <el-table-column type="index" label="序号" width="60" />
                <el-table-column prop="date" label="识别日期" width="200" />
                <el-table-column prop="image_name" label="图片名称" width="200" />
                <el-table-column prop="content" label="隐患检出" />
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
  

  
<style scoped>
.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.main-content {
  margin-top: 20px;
}

.upload-card {
  margin-bottom: 20px;
  background-color:aliceblue;
}

.uploader {
  :deep(.el-upload-dragger) {
    padding: 40px 20px;
  }
}

.example-card {
  margin-top: 20px;
}

.analyze-btn {
  width: 100%;
  margin-top: 20px;
}

.analysis-card {
  background-color: aliceblue;
}

.result-card {
  margin-top: 20px;
}

.meta-card {
  background-color: #E5EAF3;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.el-carousel__item h3 {
  display: flex;
  opacity: 0.75;
  margin: 0;
}

</style>
<style>
.el-upload-list--picture .el-upload-list__item {
  background-color: transparent;
}
.el-upload-dragger {
  background-color: transparent;
}
</style>