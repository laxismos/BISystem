<script setup lang="ts">
import { ref } from 'vue'
import { Plus, QuestionFilled, Loading } from '@element-plus/icons-vue'
import { ElNotification, type UploadProps, type UploadUserFile } from 'element-plus'

import axios from 'axios'

// 图片预览
const dialogImageUrl = ref('') 
const dialogVisible = ref(false)
// 文件上传相关
const imgList = ref<UploadUserFile[]>([])
const imageSelected = ref(false)
// 数据显示
const floors = ref(0)
const floorsOnLoading = ref(false)

const buildingIsAdded = ref(-1)
const buildingAddedRecogOnLoading = ref(false)
const keyWord = ["无加层", "有加层"]

const materialType = ref('null')
const materialTypeRecogOnLoading = ref(false)

const hiddenDangerRecogOnLoading = ref(false)

// 选择或删除文件
const handleChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  imgList.value = uploadFiles
  console.log(uploadFile, uploadFiles)
  imageSelected.value = true
}

// 预览图片的回调
const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url!
  dialogVisible.value = true
}

// 移除图片的回调
const handleRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
  console.log(uploadFile, uploadFiles)
  imageSelected.value = false
  floors.value = 0
  buildingIsAdded.value = -1
  materialType.value = 'null'
}

// 成功上传的回调
const uploadSuccess: UploadProps['onSuccess'] = (uploadFile, uploadFiles) => {
  console.log(uploadFile, uploadFiles)
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

const predictFailed = (error: any) => {
  console.log("上传失败", error)
  ElNotification({
    title: '错误',
    message: '上传失败！',
    type: 'error',
    duration: 1500
  })
}

// 按钮‘预测’
const tryToPredictFloors = (event: Event) => {
  if (event) {
    if (checkFilesExist()) {
      let file = imgList.value[0]
      if (file.raw) {
        let form = new FormData()
        form.append('image', file.raw)
        console.log(form.get('image'))
        floorsOnLoading.value = true
        axios.post('http://127.0.0.1:8000/building/floors/', form, {
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
          floors.value = response.data['floors']
        }).catch(predictFailed).finally(() => {
          floorsOnLoading.value = false
        })

      } else {
        ElNotification({
          title: '错误',
          message: '图片不存在！',
          type: 'error',
          duration: 1500
      })
      }
    }
  }
}

const tryToPredictAddFloors = (event: Event) => {
  if (event) {
    if (checkFilesExist()) {
      let file = imgList.value[0]
      if (file.raw) {
        let form = new FormData()
        form.append('image', file.raw)
        console.log(form.get('image'))
        buildingAddedRecogOnLoading.value = true
        //TODO axios 1
        axios.post('http://127.0.0.1:8000/building/add/', form, {
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
          buildingIsAdded.value = response.data['is_added']
        }).catch(predictFailed).finally(() => {
          buildingAddedRecogOnLoading.value = false
        })
      }
    }
  }
}

const tryToPredictMaterial = (event: Event) => {
  if (event) {
    if (checkFilesExist()) {
      let file = imgList.value[0]
      if (file.raw) {
        let form = new FormData()
        form.append('image', file.raw)
        console.log(form.get('image'))
        materialTypeRecogOnLoading.value = true
        //TODO axios 2
        axios.post('http://127.0.0.1:8000/building/material/', form, {
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
          materialType.value = response.data['material']
        }).catch(predictFailed).finally(() => {
          materialTypeRecogOnLoading.value = false
        })
      }
    }
  }
}

const tryToPredictHiddenDanger = (event: Event) => {
  if (event) {
    if (checkFilesExist()) {
      let file = imgList.value[0]
      if (file.raw) {
        let form = new FormData()
        form.append('image', file.raw)
        console.log(form.get('image'))
        hiddenDangerRecogOnLoading.value = true
        //TODO axios 2
        axios.post('http://127.0.0.1:8000/building/hidden/', form, {
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
          
        }).catch(predictFailed).finally(() => {
          hiddenDangerRecogOnLoading.value = false
        })
      }
    }
  }
}

// 按钮‘重置’
const resetResult = (event: Event) => {
  if (event) {
    floors.value = 0
    buildingIsAdded.value = -1
    materialType.value = 'null'
    ElNotification({
      title: '完成',
      message: '重置完成！',
      type: 'success',
      duration: 1600
    })
  }
}

</script>

<template>
  <el-row>
    <el-col :span="8">
      <p>
        上传建筑图片 
        <el-popover
          placement="top-start"
          title="提示"
          :width="400"
          trigger="hover"
        >
          <el-col>
            <p>您上传的图片应该尽可能是正面、无倾斜、无遮挡的，不符合条件的图片会影响识别的正确率。</p>
            <el-row>
              <div>正确例：</div>
              <el-image style="width: 100px;" src="/valid_sample.jpg" fit="scale-down"/>
              <div>错误例：</div>
              <el-image style="width: 100px;" src="/valid_sample.jpg" fit="scale-down"/>
              
            </el-row>
            
          </el-col>
          
          <template #reference>
            <el-button type="default" :icon="QuestionFilled" circle style="border: none;">
            </el-button>
          </template>
        </el-popover>
      </p>
      
      <el-upload 
        action="#"
        class="custom"
        :class="{ disabled : imageSelected }"
        list-type="picture-card" 
        :auto-upload="false"
        :limit="1"
        v-model:file-list="imgList"
        :on-change="handleChange"
        :on-preview="handlePictureCardPreview"
        :on-remove="handleRemove"
        :on-success="uploadSuccess"
      >
        <el-icon v-if="imgList.length == 0"><Plus /></el-icon>
      </el-upload>
      <el-row justify="center">

        <el-button 
        type="danger" 
        style="margin-top: 3vh;"
        @click="resetResult"
        >
          重置
        </el-button>
      </el-row>
      
    </el-col>
    <el-col :span="16">
      <el-row style="height: 50%;" justify="space-around" align="middle">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-row justify="space-between" align="middle">
                <span>楼层数</span>
                <el-button
                  type="primary" round plain :disabled="!imageSelected || floorsOnLoading"
                  @click="tryToPredictFloors"
                >
                  识别楼层
                  <el-icon v-if="floorsOnLoading" class="is-loading"><Loading /></el-icon>
                </el-button>
              </el-row>
              
            </div>
          </template>
          <div>
            <div v-if="floors == 0">尚未识别</div>
            <div v-else>{{ floors }}</div>
          </div>
        </el-card>
        <el-card>
          <template #header>
            <div class="card-header">
              <el-row justify="space-between" align="middle">
                <span>加层状况</span>
                <el-button
                  type="primary" round plain :disabled="!imageSelected || buildingAddedRecogOnLoading"
                  @click="tryToPredictAddFloors"
                >
                  加层识别
                  <el-icon v-if="buildingAddedRecogOnLoading" class="is-loading"><Loading /></el-icon>
                </el-button>
              </el-row>
              </div>
          </template>
          <div>
            <div v-if="buildingIsAdded == -1">尚未识别</div>
            <div v-else>{{ keyWord[buildingIsAdded] }}</div>
          </div>
        </el-card>
      </el-row>
      <el-row style="height: 50%;" justify="space-around" align="middle">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-row justify="space-between" align="middle">
                <span>材质识别</span>
                <el-button
                  type="primary" round plain :disabled="!imageSelected || materialTypeRecogOnLoading"
                  @click="tryToPredictMaterial"
                >
                  识别材质
                  <el-icon v-if="materialTypeRecogOnLoading" class="is-loading"><Loading /></el-icon>
                </el-button>
              </el-row>
            </div>
          </template>
          <div v-if="materialType == 'null'">尚未识别</div>
          <div v-else>{{ materialType }}</div>
        </el-card>
        <el-card>
          <template #header>
            <div class="card-header">
              <el-row justify="space-between" align="middle">
                <span>隐患识别</span>
                <el-button
                  type="primary" round plain :disabled="!imageSelected || hiddenDangerRecogOnLoading"
                  @click="tryToPredictHiddenDanger"
                >
                  识别隐患
                </el-button>
              </el-row>
            </div>
          </template>
          尚未识别
        </el-card>
      </el-row>
    </el-col>
  </el-row>
  <el-dialog v-model="dialogVisible">
    <img w-full :src="dialogImageUrl" alt="Preview Image" />
  </el-dialog>
</template>

<style scoped>
.disabled:deep(.el-upload--picture-card)  {
  display: none;
}

.el-card {
  width: 45%;
  margin: 2%;
}

</style>

<!-- <style>
.el-upload {
  width: 200px;
  height: 200px;
}

.el-upload-list--picture-card {
  --el-upload-list-picture-card-size: 200px;
}

</style> -->