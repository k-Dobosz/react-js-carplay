import React, { useState, useEffect, useRef } from 'react'
import './Carplay.css'
import JMuxer from 'jmuxer'
import Modal from 'react-modal'
import io from 'socket.io-client'
const socket = io('ws://localhost:5005')
let jmuxer

function Carplay({ settings, touchEvent, style }) {
  const [height, setHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const [mouseDown, setMouseDown] = useState(false)
  const [lastX, setLastX] = useState(0)
  const [lastY, setLastY] = useState(0)
  const [localStatus, setLocalStatus] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    Modal.setAppElement(document.getElementById('main'))
    console.log('creating carplay', settings)
    jmuxer = new JMuxer({
      node: 'player',
      mode: 'video',
      maxDelay: 30,
      fps: settings.fps,
      flushingTime: 100,
      debug: false,
    })

    const height = ref.current.clientHeight
    const width = ref.current.clientWidth

    setHeight(height)
    setWidth(width)

    socket.on('carplay', (data) => {
      feed(data)

      if (isLoading) setIsLoading(false)
    })

    socket.on('status', ({ status }) => {
      if (localStatus === false && status === false) setIsLoading(true)

      setLocalStatus(status)
    })

    socket.emit('statusReq')

    socket.on('quit', () => {
      socket.emit('status', { status: false })
      jmuxer.destroy()
    })

    return () => {
      console.log('cleaning')
      socket.off('carplay')
      socket.off('status')
      socket.off('quit')
      jmuxer.destroy()
    }
  }, [])

  const feed = async (data) => {
    const buf = Buffer.from(data)
    const duration = buf.readInt32BE(0)
    const video = buf.slice(4)
    // console.log("duration was: ", duration)
    jmuxer.feed({ video: new Uint8Array(video), duration: duration })
  }

  const handleMDown = (e) => {
    const currentTargetRect = e.target.getBoundingClientRect()
    let x = e.clientX - currentTargetRect.left
    let y = e.clientY - currentTargetRect.top
    x = x / width
    y = y / height
    setLastX(x)
    setLastY(y)
    setMouseDown(true)
    socket.emit('click', { type: 14, x: x, y: y })
  }

  const handleMUp = (e) => {
    const currentTargetRect = e.target.getBoundingClientRect()
    let x = e.clientX - currentTargetRect.left
    let y = e.clientY - currentTargetRect.top
    x = x / width
    y = y / height
    console.log('up')
    setMouseDown(false)
    socket.emit('click', { type: 16, x: x, y: y })
  }

  const handleMMove = (e) => {
    const currentTargetRect = e.target.getBoundingClientRect()
    let x = e.clientX - currentTargetRect.left
    let y = e.clientY - currentTargetRect.top
    x = x / width
    y = y / height
    socket.emit('click', { type: 15, x: x, y: y })
  }

  const handleDown = (e) => {
    const currentTargetRect = e.target.getBoundingClientRect()
    let x = e.touches[0].clientX - currentTargetRect.left
    let y = e.touches[0].clientY - currentTargetRect.top
    x = x / width
    y = y / height
    setLastX(x)
    setLastY(y)
    setMouseDown(true)
    socket.emit('click', { type: 14, x: x, y: y })
    e.preventDefault()
  }

  const handleUp = (e) => {
    const x = lastX
    const y = lastY
    setMouseDown(false)
    console.log('up')
    socket.emit('click', { type: 16, x: x, y: y })
    e.preventDefault()
  }

  const handleMove = (e) => {
    const currentTargetRect = e.target.getBoundingClientRect()
    let x = e.touches[0].clientX - currentTargetRect.left
    let y = e.touches[0].clientY - currentTargetRect.top
    x = x / width
    y = y / height
    socket.emit('click', { type: 15, x: x, y: y })
  }

  return (
    <div id={'main'} style={style}>
      <div
        className="App"
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        onTouchMove={(e) => {
          if (mouseDown) {
            handleMove(e)
          }
        }}
        onMouseDown={handleMDown}
        onMouseUp={handleMUp}
        onMouseMove={(e) => {
          if (mouseDown) {
            handleMMove(e)
          }
        }}
      >
        <video
          style={{ visibility: isLoading ? 'hidden' : 'visible' }}
          ref={ref}
          autoPlay
          muted
          id="player"
        />
        {localStatus ? (
          isLoading ? (
            <div className="loading"></div>
          ) : (
            ''
          )
        ) : (
          <div>CONNECT IPHONE TO BEGIN CARPLAY</div>
        )}
      </div>
    </div>
  )
}

export default Carplay
