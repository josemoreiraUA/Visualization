# Lineage: training actions and programs

Quero um programa equivalente ao lineage.js para ligar a proveniência dos dados da consulta a seguir, já anotada, com os dados fonte. A consulta anotada:

```SQL
SELECT EA.name as Employee, T.name as Action, T.hours, EA.prov || '.' || T.prov as prov
FROM   Training_actions.parquet T, Employees_training_actions.parquet EA
WHERE  T.actionId = EA.actionId
    UNION ALL
SELECT ET.name, ET.training_program, ET.hours, prov
FROM   Employees_training.parquet ET
```

O resultado é da forma:
```
Employee	Action	hours	prov
Carla Gomez	Digital Marketing	6	t1.a3
Carla Gomez	CRM	8	t2.a1
David Miller	Digital Marketing	6	t3.a3 
```

A tabela Training_actions deve ficar mais à esquerda. A tabela Employees_training_actions, deve ficar um pouco à direita dessa tabela (sem sobrepor e deixando um pouco de espaço para as conexões)e a tabela Employees_traning deve ficar debaixo da tabela Employees_training_actions.
Do lado direito do chart container devem ficar os resultados da consulta.

O objetivo é ligar cada tuplo do resultado da consulta com os tuplos correspondentes das tabelas Employees_training_actions e Employees_training. Os tuplos da tabela Employees_training_actions devem por sua vez ligar-se aos tuplos da tabela Training_actions.
As correspondências/conexões são determinadas pelos tuplos de proveniência.

Os ficheiros estão no formato parquet e têm os nomes designados no comando SQL.

O ficheiro lineage.js antigo está anexado a este prompt para referência. Podem ser introduzidas melhorias relativamente à versão antiga.
Quero tudo (script python, labels e mensagens da aplicação, etc) em lîngua inglesa.

 