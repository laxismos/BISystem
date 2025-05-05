<script setup lang="ts">
import { computed, ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElNotification } from 'element-plus'
import axios from 'axios'

interface PredictData {
  date: string,
  image_name: string,
  content: string,
  type: string,
  orgin_path?: string
  details?: Array<{  // 新增安全隐患详情字段
    id: number,
    class_name: string,
    confidence: number,
    bbox: number[] 
    area: number
  }>
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

class PathFile extends File {
    absPath?: string = ''

    constructor(fileBits: BlobPart[], fileName: string, path?: string, options?: FilePropertyBag) {
        super(fileBits, fileName, options)
        if (path) {
            this.absPath = path
        }
    }
}

const predictResult = ref<PredictData[]>([])    // 识别结果
const selectedOptions = ref<string[]>([])   // 启用的选项
const cachedImages = ref<CachedImage[]>([]) // 图片url缓存表
const typeMapper: KV = {'floors': '楼层数识别', 'add': '加层分析', 'material': '材质识别', 'hidden': '隐患检测'} // 默认映射
const sampleImageList = [
  {'url': '/valid_sample.jpg', desc:'楼层识别图像示例-1'},
  {'url': '/valid_sample2.jpg', desc:'楼层识别图像示例-2'}
] // 示例图片
const picShowValue = ref('示例图片') 
const picShowValueList = ['示例图片', '已选择']
const onLoading = ref(false)
const directoryFiles = ref<PathFile[]>([]) // 待上传的文件

const showingUploadedImage = ref<CachedImage[]>([]) // 缓存表的切片，用于控制分页显示
const uploadPage = ref(1)   // 页码，尚未实现翻页
const uploadShowCount = ref(20) // 页容量

const updateShowingUploadImage = (operationStartIndex: number) => {
    const startIndex = (uploadPage.value - 1) * uploadShowCount.value
    if (startIndex + uploadShowCount.value >= operationStartIndex) {
        showingUploadedImage.value = cachedImages.value.slice(startIndex, startIndex+uploadShowCount.value)
    }
}

const checkFilesExist = () => {
  if (directoryFiles.value.length == 0) {
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
        directoryFiles.value.forEach((e)=>{
            form.append('options', JSON.stringify(selectedOptions.value))
            form.append('image', e)
        })
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
            let _content: ResponseType[] = response.data['content']
            _content.forEach((e, index)=>{
                predictResult.value.push({date: (new Date()).toLocaleString(), 
                    content: e['result'], 
                    type:typeMapper[e['type']], 
                    image_name:e['name'],
                    orgin_path: directoryFiles.value[index%directoryFiles.value.length].absPath
                })
            })
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

// 结果表格处理
const deleteRow = (rel_index: number) => {
    const index = rel_index + (uploadPage.value - 1) * uploadShowCount.value
    cachedImages.value.splice(index, 1)
    directoryFiles.value.splice(index, 1)
    updateShowingUploadImage(0)
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

// 文件上传
const uploadFiles = (event: Event) => {
    if (event) {
        picShowValue.value = picShowValueList[1]
        window.ipcRenderer.invoke('select-files').then((value: string[])=>{
            value.forEach((f)=>{
                window.ipcRenderer.invoke('read-file', f).then((fileData)=>{
                    const blob = new Blob([fileData.buffer], { type: fileData.fileType });
                    const file: PathFile = new File([blob], fileData.fileName, {
                        type: fileData.fileType,
                        lastModified: Date.now(),
                    });
                    file.absPath = f,
                    (file as any).path
                    directoryFiles.value.push(file)
                    cachedImages.value.push({name: file.name, url:URL.createObjectURL(file)})
                    updateShowingUploadImage(cachedImages.value.length)
                })
            })
        })
    }
}

const uploadFileDirectory = (event: Event) => {
    if (event) {
        picShowValue.value = picShowValueList[1]
        window.ipcRenderer.invoke('select-directory').then((value: string[])=>{
            value.forEach((f)=>{
                window.ipcRenderer.invoke('read-file', f).then((fileData)=>{
                    const blob = new Blob([fileData.buffer], { type: fileData.fileType });
                    const file: PathFile = new File([blob], fileData.fileName, {
                        type: fileData.fileType,
                        lastModified: Date.now(),
                    });
                    file.absPath = f,
                    (file as any).path
                    directoryFiles.value.push(file)
                    cachedImages.value.push({name: file.name, url:URL.createObjectURL(file)})
                    updateShowingUploadImage(cachedImages.value.length)
                })
            })
        })
        // console.log(directoryFiles.value)
    }
}


const writeToExcel = (event: Event) => {
    if (event) {
        window.ipcRenderer.invoke('write-to-excel', JSON.stringify(predictResult.value), true)
    }
}

const handleUploadPageChange = (page: number) => {
    uploadPage.value = page
    updateShowingUploadImage(0)
}

const detailDialogVisible = ref(false) // 控制弹窗显示

// 定义单个隐患的接口
interface DetailType {
  id: number
  class_name: string
  area: number
}

// 初始化响应式数组
const currentDetails = ref<DetailType[]>([])

// 显示详情弹窗
const showDetails = (details: PredictData['details']) => {
  currentDetails.value = details || []
  detailDialogVisible.value = true
}

const totalArea = computed(() => {
  return currentDetails.value.reduce((sum, item) => sum + item.area, 0)
})

// 删除隐患条目
const deleteDetail = (index: number) => {
  currentDetails.value.splice(index, 1) // 直接修改 .value
}

</script>

<template>
    <div class="container">
        <el-row :gutter="20">
            <el-col :span="6">
                <div style="height: 20%; margin-bottom: 20px;">
                    <el-card class="tip-card">

                    </el-card>
                </div>
                <div style="height: 28%;  margin-bottom: 20px;">
                    <el-card class="upload-card">
                        <div style="text-align: left; width: 100%; font-weight: bold; margin-bottom: 20px;">上传</div>
                        <el-button type="primary" style="margin-top: 30px; width: 100%;" @click="uploadFiles">
                            上传文件
                        </el-button>
                        <el-button type="success" style="margin: auto; margin-top: 30px; width: 100%;" @click="uploadFileDirectory">
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
                                @click="writeToExcel"
                            >
                                导出为Excel
                            </el-button>    
                        </el-col>
                        
                    </el-card>
                </div>
            </el-col>
            <el-col :span="9" style="height: 900px;">
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
                            <div style="height: 400px;">
                                <el-empty v-if="directoryFiles.length == 0" description="暂无图片" />
                                <div v-else>
                                    <el-table :data="showingUploadedImage" :show-header="false" height="400px">
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
                                    <el-pagination 
                                    layout="total, prev, pager, next, jumper" 
                                    size="small"
                                    :total="cachedImages.length" 
                                    :page-size="uploadShowCount"
                                    @current-change="handleUploadPageChange"
                                    style="margin-top: 10px;"
                                    />
                                    
                                </div>
                            </div>
                            <el-card style="margin-top: 40px;"></el-card>
                        </div>
                    </el-card>
                </div>
            </el-col>
            <el-col :span="9">
                <div style="height: 100%;">
                    <el-card class="result-card">
                        <template #header style="width: 100%;">
                            <div style="width: 100%; text-align: left; font-weight: bold;">结果展示</div>
                        </template>
                        <el-empty v-if="predictResult.length == 0" description="暂无结果" />
                        <el-table v-else :data="predictResult" :row-class-name="tableRowClassName" height="800px">
                            <el-table-column type="index" label="序号" width="80" />
                            <el-table-column prop="image_name" label="图片名称" width="320" />
                            <el-table-column label="结果" width="200" align="center">
                                <template #default="scope">
                                    <div v-if="scope.row.type === '隐患检测'">
                                        <div v-for="(detail, index) in scope.row.details?.slice(0, 2)" :key="index">
                                            {{ detail.class_name }} ({{ detail.area.toFixed(2) }}px²)
                                        </div>
                                        <span v-if="scope.row.details?.length > 2">...</span>
                                    </div>
                                    <div v-else>
                                        {{ scope.row.content }}
                                    </div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="type" label="任务类型" width="120" sortable />
                            <el-table-column prop="date" label="识别日期" sortable />
                        </el-table>
                    </el-card>
                </div>
            </el-col>
        </el-row>

        <el-dialog v-model="detailDialogVisible" title="安全隐患详情" width="800px">
            <div class="statistics">
                <el-tag type="info">隐患总数：{{ currentDetails.length }}</el-tag>
                <el-tag type="warning">
                    总面积：{{ totalArea.toFixed(2) }}px²
                </el-tag>
            </div>
            <el-table :data="currentDetails" border height="400px">
                <el-table-column label="编号" width="100" align="center">
                    <template #default="scope">
                        {{ scope.$index + 1 }}
                    </template>
                </el-table-column>
                <el-table-column prop="class_name" label="类型" align="center" />
                <el-table-column label="面积（像素²）" align="center">
                    <template #default="scope">
                        {{ scope.row.area.toFixed(2) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                    <template #default="scope">
                        <el-button
                        type="danger"
                        size="small"
                        @click="deleteDetail(scope.$index)"
                        >删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </div>
</template>

<style scoped>
.container {
  max-width: 2400px;
  margin: auto;
  margin-top: 10px;
  padding: 0;
}

.tip-card {
    height: 100%;
    border-radius: 12px;
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
.statistics {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}
</style>