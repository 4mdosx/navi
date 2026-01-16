import { SWRConfig } from 'swr'

export function SWRConfigWrapper(props: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (resource, init) =>
          fetch(resource, init).then((res) => res.json()),
      }}
    >
      {props.children}
    </SWRConfig>
  )
}
