'use client'

import './page.css'
import Computer from './computer'
import Screenshot from '@/components/screenshot'
import { useEffect } from 'react'

function DrawLink() {
  // TODO: Schema

  const computerA = document.getElementById('computer-A')!
  const computerB = document.getElementById('computer-B')!
  const link = document.createElement('div')
  link.className = 'link'
  link.setAttribute('id', 'link-A-B')
  link.classList.add('net-links')
  const box = document.getElementById('simple-network')!
  const postionA = computerA.getBoundingClientRect()
  const postionB = computerB.getBoundingClientRect()
  const postionBox = box.getBoundingClientRect()
  link.style.left = postionA.left + 50 - postionBox.left + 'px'
  link.style.top = postionA.top + 50 - 10 - postionBox.top + 'px'
  link.style.width = Math.sqrt(Math.pow(postionA.left - postionB.left, 2) + Math.pow(postionA.top - postionB.top, 2)) + 'px'
  link.style.transform = 'rotate(' + Math.atan2(postionB.top - postionA.top, postionB.left - postionA.left) * 180 / Math.PI + 'deg)'
  box.appendChild(link)
}
function CleanLink(boxName: string) {
  const links = document.querySelectorAll(`#${boxName} .net-links`)
  links.forEach(link => {
    link.remove()
  })
}

function SimpleNetwork() {
  useEffect(() => {
    DrawLink()
    return () => {
      CleanLink('simple-network')
    }
  }, [])
  return (
    <div className="card simple-network" id="simple-network">
      <div className="card-header">A Simple NetWork</div>
      <div className="card-content">
        <Computer name="A" />
        <Computer name="B" />
      </div>
    </div>
  )
}

export default function NetworkTopologyApp(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-24 network-topology-app">
      <h1 className="mb-6">Network Topology</h1>
      <SimpleNetwork />
      <div className="mt-4 flex justify-center w-full items-center">
        <Screenshot domId="simple-network" />
      </div>
    </main>
  )
}
