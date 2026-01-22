import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware, authorize } from '../utils/auth.js'
import { prismaClinicDataService } from '../services/prismaClinicDataService.js'

const router = Router()

/**
 * GET /api/clinic
 * Lista todas as clínicas
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        clinicInsurances: {
          include: {
            insurance: true
          }
        },
        offeredProcedures: {
          include: {
            procedure: true
          }
        },
        clinicProcedures: {
          include: {
            insurance: true,
            procedure: true
          }
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    })

    res.json(clinics)
  } catch (error) {
    console.error('Erro ao buscar clínicas:', error)
    res.status(500).json({ error: 'Erro ao buscar clínicas' })
  }
})

/**
 * GET /api/clinic/:id
 * Busca uma clínica específica
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        clinicInsurances: {
          include: {
            insurance: true
          }
        },
        offeredProcedures: {
          include: {
            procedure: true
          }
        },
        clinicProcedures: {
          include: {
            insurance: true,
            procedure: true
          }
        }
      }
    })

    if (!clinic) {
      res.status(404).json({ error: 'Clínica não encontrada' })
      return
    }

    res.json(clinic)
  } catch (error) {
    console.error('Erro ao buscar clínica:', error)
    res.status(500).json({ error: 'Erro ao buscar clínica' })
  }
})

/**
 * POST /api/clinic
 * Cria uma nova clínica
 */
router.post('/', authMiddleware, authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, displayName, address, phone, email } = req.body

    const clinic = await prisma.clinic.create({
      data: {
        code,
        name,
        displayName,
        address,
        neighborhood: '',
        city: 'Manaus',
        state: 'AM',
        zipCode: '',
        phone,
        email,
        openingHours: {},
        specialties: [],
        accessibility: {}
      }
    })

    res.json(clinic)
  } catch (error) {
    console.error('Erro ao criar clínica:', error)
    res.status(500).json({ error: 'Erro ao criar clínica' })
  }
})

/**
 * PUT /api/clinic/:id
 * Atualiza uma clínica
 */
router.put('/:id', authMiddleware, authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, displayName, address, phone, email } = req.body

    const clinic = await prisma.clinic.update({
      where: { id },
      data: {
        name,
        displayName,
        address,
        phone,
        email
      }
    })

    res.json(clinic)
  } catch (error) {
    console.error('Erro ao atualizar clínica:', error)
    res.status(500).json({ error: 'Erro ao atualizar clínica' })
  }
})

/**
 * DELETE /api/clinic/:id
 * Remove uma clínica
 */
router.delete('/:id', authMiddleware, authorize(['MASTER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await prisma.clinic.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover clínica:', error)
    res.status(500).json({ error: 'Erro ao remover clínica' })
  }
})

/**
 * GET /api/clinic/:id/procedures
 * Lista procedimentos de uma clínica
 */
router.get('/:id/procedures', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const clinicProcedures = await prisma.clinicProcedure.findMany({
      where: {
        clinicId: id
      },
      include: {
        procedure: true
      }
    })

    // Buscar preços por convênio
    const proceduresWithPrices = await Promise.all(
      clinicProcedures.map(async (cp) => {
        const prices = await prisma.clinicInsuranceProcedure.findMany({
          where: {
            clinicId: id,
            procedureCode: cp.procedureCode
          },
          include: {
            insurance: true
          }
        })

        return {
          ...cp.procedure,
          defaultPrice: cp.defaultPrice,
          prices
        }
      })
    )

    res.json(proceduresWithPrices)
  } catch (error) {
    console.error('Erro ao buscar procedimentos:', error)
    res.status(500).json({ error: 'Erro ao buscar procedimentos' })
  }
})

/**
 * GET /api/clinic/:id/insurances
 * Lista convênios aceitos por uma clínica
 */
router.get('/:id/insurances', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const clinicInsurances = await prisma.clinicInsurance.findMany({
      where: {
        clinicId: id,
        isActive: true
      },
      include: {
        insurance: true
      }
    })

    res.json(clinicInsurances.map(ci => ci.insurance))
  } catch (error) {
    console.error('Erro ao buscar convênios:', error)
    res.status(500).json({ error: 'Erro ao buscar convênios' })
  }
})

/**
 * GET /api/clinic/all/insurances
 * Lista todos os convênios (de todas as clínicas)
 */
router.get('/all/insurances', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const insurances = await prisma.insuranceCompany.findMany({
      where: {
        isActive: true
      },
      include: {
        clinicInsurances: {
          include: {
            clinic: true
          }
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    })

    res.json(insurances)
  } catch (error) {
    console.error('Erro ao buscar convênios:', error)
    res.status(500).json({ error: 'Erro ao buscar convênios' })
  }
})

/**
 * GET /api/clinic/all/procedures
 * Lista todos os procedimentos (de todas as clínicas)
 */
router.get('/all/procedures', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const procedures = await prisma.procedure.findMany({
      include: {
        offeredBy: {
          include: {
            clinic: true
          }
        },
        clinicProcedures: {
          include: {
            clinic: true,
            insurance: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    res.json(procedures)
  } catch (error) {
    console.error('Erro ao buscar procedimentos:', error)
    res.status(500).json({ error: 'Erro ao buscar procedimentos' })
  }
})

/**
 * POST /api/clinic/:clinicId/procedure
 * Adiciona um procedimento a uma clínica
 */
router.post('/:clinicId/procedure', authMiddleware, authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicId } = req.params
    const { procedureCode, defaultPrice } = req.body

    // Verificar se procedimento existe
    const procedure = await prisma.procedure.findUnique({
      where: { code: procedureCode }
    })

    if (!procedure) {
      res.status(404).json({ error: 'Procedimento não encontrado' })
      return
    }

    // Adicionar procedimento à clínica
    const clinicProcedure = await prisma.clinicProcedure.create({
      data: {
        clinicId,
        procedureCode,
        defaultPrice
      }
    })

    res.json(clinicProcedure)
  } catch (error) {
    console.error('Erro ao adicionar procedimento:', error)
    res.status(500).json({ error: 'Erro ao adicionar procedimento' })
  }
})

/**
 * PUT /api/clinic/procedure/:clinicProcedureId/price
 * Atualiza preço padrão de um procedimento na clínica
 */
router.put('/procedure/:clinicProcedureId/price', authMiddleware, authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicProcedureId } = req.params
    const { defaultPrice } = req.body

    const updated = await prisma.clinicProcedure.update({
      where: { id: clinicProcedureId },
      data: { defaultPrice }
    })

    res.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar preço:', error)
    res.status(500).json({ error: 'Erro ao atualizar preço' })
  }
})

/**
 * POST /api/clinic/:clinicId/insurance/:insuranceCode/procedure/:procedureCode/price
 * Define preço de um procedimento para um convênio específico
 */
router.post('/:clinicId/insurance/:insuranceCode/procedure/:procedureCode/price', authMiddleware, authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicId, insuranceCode, procedureCode } = req.params
    const { price, hasPackage, packageInfo } = req.body

    const priceRecord = await prisma.clinicInsuranceProcedure.upsert({
      where: {
        clinicId_insuranceCode_procedureCode: {
          clinicId,
          insuranceCode,
          procedureCode
        }
      },
      create: {
        clinicId,
        insuranceCode,
        procedureCode,
        price,
        hasPackage: hasPackage || false,
        packageInfo: packageInfo || null
      },
      update: {
        price,
        hasPackage: hasPackage || false,
        packageInfo: packageInfo || null
      }
    })

    res.json(priceRecord)
  } catch (error) {
    console.error('Erro ao definir preço:', error)
    res.status(500).json({ error: 'Erro ao definir preço' })
  }
})

/**
 * GET /api/clinic/data
 * Retorna dados consolidados da clínica para uso no N8N (procedimentos, convênios, unidades)
 * Este endpoint é usado pelo workflow N8N para carregar contexto
 */
router.get('/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const procedures = await prismaClinicDataService.getProcedures()
    const insuranceCompanies = await prismaClinicDataService.getInsuranceCompanies()
    const locations = await prismaClinicDataService.getLocations()

    // Formatar dados para o formato esperado pelo N8N
    const formattedData = {
      procedures: procedures.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        duration: p.duration,
        categories: p.categories || []
      })),
      insuranceCompanies: insuranceCompanies.map(i => ({
        id: i.id,
        name: i.name,
        code: (i as any).code || i.id
      })),
      units: locations.map(l => ({
        id: l.id,
        name: l.name,
        code: (l as any).code || l.id
      }))
    }

    res.json(formattedData)
  } catch (error) {
    console.error('Erro ao buscar dados da clínica:', error)
    res.status(500).json({ error: 'Erro ao buscar dados da clínica' })
  }
})

export default router
