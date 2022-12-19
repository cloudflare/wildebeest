import { component$, useStylesScoped$ } from '@builder.io/qwik'
import InstanceDetails from './InstanceDetails'
import styles from './LeftColumn.scss?inline'

export const LeftColumn = component$(() => {
  useStylesScoped$(styles)

  return (
    <>
      <input class="search" type="text" placeholder="search" />
      <InstanceDetails />
    </>
  )
})
