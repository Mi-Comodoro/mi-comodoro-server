import { LoggerProviderService } from '@/core/providers';

import { AccountDeletionService } from '../account-deletion.service';
import { AccountPurgeCron } from '../account-purge.cron';

// El servicio real importa el SDK de Firebase (ESM) que Jest no carga: aquí solo importa el contrato
jest.mock('../account-deletion.service', () => ({ AccountDeletionService: class {} }));

describe('AccountPurgeCron', () => {
  const purgeDue = jest.fn();
  const logger = { error: jest.fn() };
  let cron: AccountPurgeCron;

  beforeEach(() => {
    jest.clearAllMocks();
    cron = new AccountPurgeCron(
      { purgeDue } as unknown as AccountDeletionService,
      logger as unknown as LoggerProviderService,
    );
  });

  it('ejecuta el borrado permanente de las cuentas vencidas', async () => {
    purgeDue.mockResolvedValue({ purged: 1, failed: 0 });
    await cron.run();
    expect(purgeDue).toHaveBeenCalledTimes(1);
  });

  it('un error no tumba la tarea: se registra sin datos de la persona', async () => {
    purgeDue.mockRejectedValue(new Error('base de datos caída'));
    await expect(cron.run()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('no se solapa consigo misma si la ejecución anterior sigue en curso', async () => {
    let finish: (value: unknown) => void = () => undefined;
    purgeDue.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const first = cron.run();
    await cron.run(); // segunda llamada mientras la primera no termina
    expect(purgeDue).toHaveBeenCalledTimes(1);

    finish({ purged: 0, failed: 0 });
    await first;
    purgeDue.mockResolvedValueOnce({ purged: 0, failed: 0 });
    await cron.run();
    expect(purgeDue).toHaveBeenCalledTimes(2);
  });
});
