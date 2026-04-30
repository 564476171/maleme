import { type RegistrationMode } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getRegistrationMode(): Promise<RegistrationMode> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: 'registrationMode' },
  })

  if (
    setting?.value === 'OPEN' ||
    setting?.value === 'INVITE' ||
    setting?.value === 'CLOSED'
  ) {
    return setting.value
  }

  return 'OPEN'
}

export async function setRegistrationMode(value: RegistrationMode) {
  return prisma.appSetting.upsert({
    where: { key: 'registrationMode' },
    update: { value },
    create: { key: 'registrationMode', value },
  })
}
