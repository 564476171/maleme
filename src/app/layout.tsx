import type { Metadata } from 'next'
import { Kalam, Patrick_Hand } from 'next/font/google'
import './globals.css'

const displayFont = Kalam({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display',
})

const bodyFont = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: '骂了么',
  description: '每日一骂，远离暧昧内耗。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  )
}
