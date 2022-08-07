import type { NextPage } from 'next'
import { useRef, useState } from 'react'
import styled from 'styled-components'
import * as tus from "tus-js-client"

const Wrapper = styled.div`
  min-height: 60vh;
  max-width: 900px;
  margin: 120px auto;
  border: 3px solid green;
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .progress-bar {
    height: 90px;
    width: 90px;
    border: 3px solid blue;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
  }
  .upload-state {
    display: flex;
    flex-direction: column;
    text-align: center;
    margin-top: 18px;
    font-size: 16px;
    span {
      :nth-child(1){
        color: red;
        font-size: 24px;
      }
    }
  }
  .btn-wrapper{
    margin-top: 15px;
    .cancel-btn{
      background: red;
      color: white;
      font-weight: 400;
      border-radius: 6px;
      font-size: 24px;
      cursor: pointer;
    }
    .pause-btn{
      margin-left: 12px;
      background: orange;
      color: white;
      font-weight: 400;
      border-radius: 6px;
      font-size: 24px;
      cursor: pointer;
    }
    .resume-btn{
      margin-left: 12px;
      background: green;
      color: white;
      font-weight: 400;
      border-radius: 6px;
      font-size: 24px;
      cursor: pointer;
    }
  }
  & label {
    margin-top: 30px;
    font-size: 24px;
    cursor: pointer;
    border: 3px solid brown;
    height: 45px;
    width: 120px;
    border-radius: 9px;
    color: white;
    background: black;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  & input {
    display: none;
  }
`
const Home: NextPage = () => {
  //reference for file input element; required when file need to be cleared.
  const fileUploadRef = useRef<HTMLInputElement>(null)

  //state to track the upload state like 'Uploading', 'Paused', 'Upload Successful'.
  const [uploadState, setUploadState] = useState("")

  //state that represent current file that is being uploading.
  const [file, setFile] = useState<File | null>(null)

  /*
  state that keeps track of current http request that is uploading a file.
  this is very important while pausing the upload in which case the request has to be aborted.
  well, the library tus-js-client has the method to abort the upload but in my implementation it
  does not seem to work. So, I created this state so that I can abort the upload request on my own.
  */
  const [currUploadReq, setCurrUploadReq] = useState<tus.HttpRequest | null>(null)

  //keeps track of progress of the current file that is uploading.
  const [progress, setProgress] = useState(0)

  //initialize tus upload object.
  const upload = file && new tus.Upload(file, {
    endpoint: "http://localhost:8080/tus-files/",
    retryDelays: [0, 3000],
    metadata: {
        filename: file.name,
        filetype: file.type
    },
    onError: (error) => {
      setUploadState("Paused")
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      setProgress(Number((bytesUploaded / bytesTotal * 100).toFixed(2)))
    },
    onSuccess: () => {
      setUploadState("Upload Successful")
      setFile(null)
      if(fileUploadRef.current) fileUploadRef.current.value = ""
    },
    onBeforeRequest: (req: tus.HttpRequest) => {
      if(req.getMethod() === "PATCH"){
        setCurrUploadReq(req)
      }
    }
  })

  //handler that runs when upload is cancelled.
  const uploadCancelHandler = () => {
    currUploadReq?.abort()
    setUploadState("")
    setProgress(0)
    setFile(null)
    if(fileUploadRef.current) fileUploadRef.current.value = ""
  }

  //handler that runs when upload is paused.
  const uploadPauseHandler = () => {
    if(upload) {
      setUploadState("Paused")
      currUploadReq?.abort()
    }
  }

  //handler that runs when upload is resumed.
  const uploadResumeHandler = () => {
    if(!upload) return
    upload.findPreviousUploads().then(function (previousUploads) {
      if (previousUploads.length) {
        setUploadState("Uploading")
        upload.resumeFromPreviousUpload(previousUploads[0])
      }
      upload.start()
    })
  }

  //initiation of file upload.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files === null) return
    setUploadState("Uploading")
    const myFile = e.target.files[0]
    setFile(myFile)
  }

  return (
    <Wrapper>
      <div className="progress-bar">
        {`${progress}%`}
      </div>
      <div className="upload-state">
        <span>{uploadState}</span>
        <span>{file? file.name : ""}</span>
      </div>
      <div className='btn-wrapper'>
        <button className='cancel-btn' onClick={uploadCancelHandler}>Cancel</button>
        <button className='pause-btn' onClick={uploadPauseHandler}>Pause</button>
        <button className='resume-btn' onClick={uploadResumeHandler}>{uploadState==="Paused"?"Resume":"Start"}</button>
      </div>
      <label htmlFor="file-input">
        Upload
      </label>
      <input
        id="file-input"
        type="file"
        ref={fileUploadRef}
        onChange={handleFileChange}
        accept="video/*"
      />
    </Wrapper>
  )
}

export default Home

