import NaviIcon from '@/app/components/navi-icon'
import './screenshot.css'
import html2canvas from 'html2canvas'

export default function Screenshot({ domId, shotClassName = 'screenshot' }: { domId: string, shotClassName?: string }) {
  const handleScreenshot = async () => {
    const dom = document.getElementById(domId)!
    dom.classList.add(shotClassName)
    html2canvas(dom).then((canvas) => {
      canvas.toBlob((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob!)
        a.download = `${domId}-screenshot-${Date.now()}.png`
        a.click()
        dom.classList.remove(shotClassName)
      })
    })
  }

  return (
    <div className="screenshot">
      <button className="screenshot-button" onClick={handleScreenshot}>
        <NaviIcon icon="material-symbols:fit-screen" />
      </button>
    </div>
  )
}
