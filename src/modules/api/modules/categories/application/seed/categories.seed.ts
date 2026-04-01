import { Inject } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';
import { CategoryEntity } from '@/modules/api/modules/categories/infrastructure/database/category.entity';

import { CategoryBucket, CategoryType } from '../../domain/category';
import { CategoryRepository } from '../../domain/repositories/category.repository';

export class CategorySeederService {
  private readonly context: string = CategorySeederService.name;
  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: CategoryRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async seed() {
    const exists = await this.categoryRepository.count();

    if (exists > 0) {
      this.logger.info(this.context, '⚠️ Categories already seeded');
      return;
    }
    const structure = [
      {
        name: 'Vivienda',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.NEEDS,
        children: ['Alquiler', 'Hipoteca', 'Internet', 'Electricidad', 'Agua', 'Gas'],
      },
      {
        name: 'Transporte',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.NEEDS,
        children: ['Gasolina', 'Transporte público', 'Uber / Taxi', 'Mantenimiento vehículo'],
      },
      {
        name: 'Alimentación',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.NEEDS,
        children: ['Supermercado', 'Mercado local'],
      },
      {
        name: 'Salud',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.NEEDS,
        children: ['Seguro médico', 'Medicamentos', 'Consultas médicas'],
      },
      {
        name: 'Entretenimiento',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.WANTS,
        children: ['Netflix', 'Spotify', 'Cine', 'Videojuegos'],
      },
      {
        name: 'Restaurantes',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.WANTS,
        children: ['Comidas fuera', 'Cafeterías'],
      },
      {
        name: 'Compras personales',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.WANTS,
        children: ['Ropa', 'Tecnología', 'Accesorios'],
      },
      {
        name: 'Viajes',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.WANTS,
        children: ['Vuelos', 'Hotel', 'Actividades'],
      },
      {
        name: 'Ahorros',
        type: CategoryType.SAVINGS,

        children: ['Fondo de emergencia', 'Retiro', 'Inversiones', 'Viaje futuro'],
      },
      {
        name: 'Ingresos',
        type: CategoryType.INCOME,

        children: ['Salario', 'Freelance', 'Negocio', 'Otros ingresos'],
      },
    ];
    for (const group of structure) {
      const newParent: Partial<CategoryEntity> = {
        name: group.name,
        type: group.type,
        bucket: group.bucket,
        isSelectable: false,
      };
      this.logger.info(this.context, `Creando categoría principal: ${group.name}`);
      const parent = await this.categoryRepository.save(newParent);

      for (const childName of group.children) {
        const newChild: Partial<CategoryEntity> = {
          name: childName,
          type: group.type,
          bucket: group.bucket,
          parentId: parent.id,
          isSelectable: true,
        };

        this.logger.info(this.context, `Creando subcategoría: ${childName} bajo ${group.name}`);
        await this.categoryRepository.save(newChild);
      }
      this.logger.info(this.context, '✅ Categorías creadas correctamente');
    }
  }
}
