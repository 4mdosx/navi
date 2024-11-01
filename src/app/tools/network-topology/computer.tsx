import NaviIcon from '@/components/navi-icon'

export default function Computer({ name }: { name: string }): React.ReactElement {
  return <div className='computer icon' id={'computer-' + name}>
    <NaviIcon icon='mdi:computer' />
    <div className='name'>{name}</div>
  </div>
}
