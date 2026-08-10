# Lineage: training actions and programs aggregated by employee

Quero um programa equivalente ao lineage.js para ligar a proveniência dos dados da consulta a seguir, já anotada, com os dados fonte. A consulta anotada:

```SQL
-- Query example lineage with aggregation by employee.
SELECT EA.name as Employee, SUM(T.hours) as hours, '(' || STRING_AGG(EA.prov || ' · ' || T.prov || ' ⊗ ' || hours, '  +  '  ORDER BY EA.prov, T.prov) || ')' as prov
FROM   Training_actions.parquet T, Employees_training_actions.parquet EA
WHERE  T.actionId = EA.actionId
GROUP BY EA.name
    UNION ALL
SELECT ET.name, ET.hours, prov
FROM   Employees_training.parquet ET
```

O resultado é da forma:
```
Employee	hours	prov
Carla Gomez	14	(t1 · a3 ⊗ 6 + t2 · a1 ⊗ 8)
David Miller	20	(t3 · a3 ⊗ 6 + t4 · a1 ⊗ 8 + t5 · a2 ⊗ 6)
Joshua Greene	46	(t10 · a7 ⊗ 12 + t11 · a1 ⊗ 8 + t6 · a5 ⊗ 8 + t7 · a4 ⊗ 6 + t8 · a2 ⊗ 6 + t9 · a9 ⊗ 6)
Mrs. Angela Thomas DVM	14	(t12 · a4 ⊗ 6 + t13 · a1 ⊗ 8)
```

A tabela Training_actions deve ficar mais à esquerda. A tabela Employees_training_actions, deve ficar um pouco à direita dessa tabela (sem sobrepor e deixando um pouco de espaço para as conexões)e a tabela Employees_traning deve ficar debaixo da tabela Employees_training_actions.

Do lado direito do chart container devem ficar os resultados da consulta, cada tuplo (nome do empregado e horas) na sua linha. Quando passo o rato sobre um tuplo no resultado (onMouseOver) também quero ver uma caixa de texto com a proveniência.

O objetivo é ligar cada tuplo do resultado da consulta com os tuplos correspondentes das tabelas Employees_training_actions e Employees_training. Os tuplos da tabela Employees_training_actions devem por sua vez ligar-se aos tuplos da tabela Training_actions.
As correspondências/conexões são determinadas pelos tuplos de proveniência.

Os ficheiros estão no formato parquet e têm os nomes designados no comando SQL.

O ficheiro lineage.js antigo está anexado a este prompt para referência. Podem ser introduzidas melhorias relativamente a essa versão.
Quero tudo (script python, labels e mensagens da aplicação, etc) em lîngua inglesa.

 


 # Lineage: training actions and programs not aggregated

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
