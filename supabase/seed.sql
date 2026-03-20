-- GameRex Seed Data: 116 events (no titles for confidentiality)
-- Subtrilha codes:
--   T1-1: Aplicações de IA (Geração/Interpretação/Processamento)
--   T1-2: Chats e Agentes
--   T1-3: Demonstração de Potenciais Aplicações de IA
--   T1-4: Scientific Machine Learning
--   T2-1: Governança, Segurança, Conformidade e Democratização
--   T2-2: Arquitetura, Armazenamento, Integração, Interoperabilidade
--   T2-3: Qualidade de Dados, Metadados, Dados Mestres
--   T3-1: Gestão de Mudança
--   T3-2: Gestão do Conhecimento
--   T3-3: IA Responsável
--   T3-4: Infraestrutura HPC e Pipelines
--   T3-5: MLOps, Operacionalização e Sustentação

INSERT INTO events (id, type, day, room, time_slot, track_code, subtrilha) VALUES
-- Plenárias (1 per morning)
('PLEN-D1', 'plenaria', 1, NULL, '08h-12h', NULL, NULL),
('PLEN-D2', 'plenaria', 2, NULL, '08h-12h', NULL, NULL),
('PLEN-D3', 'plenaria', 3, NULL, '08h-11h', NULL, NULL),

-- Mini-Expo Stands (3 stands × 3 days = 9)
('STAND-1-D1', 'stand', 1, 'Stand 1', '13h30-16h30', NULL, NULL),
('STAND-2-D1', 'stand', 1, 'Stand 2', '13h30-16h30', NULL, NULL),
('STAND-3-D1', 'stand', 1, 'Stand 3', '13h30-16h30', NULL, NULL),
('STAND-1-D2', 'stand', 2, 'Stand 1', '13h30-16h30', NULL, NULL),
('STAND-2-D2', 'stand', 2, 'Stand 2', '13h30-16h30', NULL, NULL),
('STAND-3-D2', 'stand', 2, 'Stand 3', '13h30-16h30', NULL, NULL),
('STAND-1-D3', 'stand', 3, 'Stand 1', '13h30-16h30', NULL, NULL),
('STAND-2-D3', 'stand', 3, 'Stand 2', '13h30-16h30', NULL, NULL),
('STAND-3-D3', 'stand', 3, 'Stand 3', '13h30-16h30', NULL, NULL),

-- Orais Dia 1 - Auditório
('A0004', 'oral', 1, 'Auditório', '14h30-14h55', 'T1', 'T1-2'),
('A0025', 'oral', 1, 'Auditório', '14h55-15h20', 'T2', 'T2-3'),
('A0027', 'oral', 1, 'Auditório', '15h20-15h45', 'T2', 'T2-3'),
('A0003', 'oral', 1, 'Auditório', '15h45-16h10', 'T1', 'T1-3'),

-- Orais Dia 1 - Sala .DAT
('A0006', 'oral', 1, 'Sala .DAT', '14h30-14h55', 'T1', 'T1-1'),
('A0009', 'oral', 1, 'Sala .DAT', '14h55-15h20', 'T1', 'T1-3'),
('A0043', 'oral', 1, 'Sala .DAT', '15h20-15h45', 'T3', 'T3-4'),
('A0030', 'oral', 1, 'Sala .DAT', '15h45-16h10', 'T2', 'T2-2'),

-- Orais Dia 1 - Sala .LAS
('A0019', 'oral', 1, 'Sala .LAS', '14h30-14h55', 'T1', 'T1-1'),
('A0015', 'oral', 1, 'Sala .LAS', '14h55-15h20', 'T1', 'T1-4'),
('A0040', 'oral', 1, 'Sala .LAS', '15h20-15h45', 'T2', 'T2-2'),
('A0037', 'oral', 1, 'Sala .LAS', '15h45-16h10', 'T2', 'T2-1'),

-- Orais Dia 1 - Sala .SEGY
('A0013', 'oral', 1, 'Sala .SEGY', '14h30-14h55', 'T1', 'T1-1'),
('A0010', 'oral', 1, 'Sala .SEGY', '14h55-15h20', 'T1', 'T1-4'),
('A0031', 'oral', 1, 'Sala .SEGY', '15h20-15h45', 'T2', 'T2-3'),
('A0032', 'oral', 1, 'Sala .SEGY', '15h45-16h10', 'T2', 'T2-3'),

-- Orais Dia 2 - Auditório
('A0001', 'oral', 2, 'Auditório', '14h30-14h55', 'T1', 'T1-4'),
('A0002', 'oral', 2, 'Auditório', '14h55-15h20', 'T1', 'T1-4'),
('A0024', 'oral', 2, 'Auditório', '15h20-15h45', 'T2', 'T2-2'),
('A0026', 'oral', 2, 'Auditório', '15h45-16h10', 'T2', 'T2-2'),
('A0005', 'oral', 2, 'Auditório', '16h10-16h35', 'T1', 'T1-4'),

-- Orais Dia 2 - Sala .DAT
('A0014', 'oral', 2, 'Sala .DAT', '14h30-14h55', 'T1', 'T1-1'),
('A0008', 'oral', 2, 'Sala .DAT', '14h55-15h20', 'T1', 'T1-1'),
('A0011', 'oral', 2, 'Sala .DAT', '15h20-15h45', 'T1', 'T1-1'),
('A0029', 'oral', 2, 'Sala .DAT', '15h45-16h10', 'T2', 'T2-3'),
('A0033', 'oral', 2, 'Sala .DAT', '16h10-16h35', 'T2', 'T2-2'),

-- Orais Dia 2 - Sala .LAS
('A0042', 'oral', 2, 'Sala .LAS', '14h30-14h55', 'T3', 'T3-5'),
('A0016', 'oral', 2, 'Sala .LAS', '14h55-15h20', 'T1', 'T1-4'),
('A0021', 'oral', 2, 'Sala .LAS', '15h20-15h45', 'T1', 'T1-1'),
('A0038', 'oral', 2, 'Sala .LAS', '15h45-16h10', 'T2', 'T2-3'),
('A0023', 'oral', 2, 'Sala .LAS', '16h10-16h35', 'T1', 'T1-1'),

-- Orais Dia 2 - Sala .SEGY
('A0041', 'oral', 2, 'Sala .SEGY', '14h30-14h55', 'T3', 'T3-3'),
('A0017', 'oral', 2, 'Sala .SEGY', '14h55-15h20', 'T1', 'T1-1'),
('A0020', 'oral', 2, 'Sala .SEGY', '15h20-15h45', 'T1', 'T1-2'),
('A0034', 'oral', 2, 'Sala .SEGY', '15h45-16h10', 'T2', 'T2-3'),
('A0035', 'oral', 2, 'Sala .SEGY', '16h10-16h35', 'T2', 'T2-3'),

-- Orais Dia 3 - Auditório
('A0007', 'oral', 3, 'Auditório', '14h30-14h55', 'T1', 'T1-2'),
('A0028', 'oral', 3, 'Auditório', '14h55-15h20', 'T2', 'T2-1'),

-- Orais Dia 3 - Sala .DAT
('A0012', 'oral', 3, 'Sala .DAT', '14h30-14h55', 'T1', 'T1-1'),
('A0044', 'oral', 3, 'Sala .DAT', '14h55-15h20', 'T3', 'T3-4'),

-- Orais Dia 3 - Sala .LAS
('A0022', 'oral', 3, 'Sala .LAS', '14h30-14h55', 'T1', 'T1-4'),
('A0039', 'oral', 3, 'Sala .LAS', '14h55-15h20', 'T2', 'T2-3'),

-- Orais Dia 3 - Sala .SEGY
('A0018', 'oral', 3, 'Sala .SEGY', '14h30-14h55', 'T1', 'T1-1'),
('A0036', 'oral', 3, 'Sala .SEGY', '14h55-15h20', 'T2', 'T2-1'),

-- Posters Dia 1 (13h30-14h30)
('P0033', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0059', 'poster', 1, NULL, '13h30-14h30', 'T3', 'T3-1'),
('P0045', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0016', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0007', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0041', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0028', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-2'),
('P0013', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0010', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-3'),
('P0022', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-2'),
('P0057', 'poster', 1, NULL, '13h30-14h30', 'T3', 'T3-2'),
('P0035', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0025', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-3'),
('P0038', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0052', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0004', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0019', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0031', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0049', 'poster', 1, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0001', 'poster', 1, NULL, '13h30-14h30', 'T1', 'T1-1'),

-- Posters Dia 2 (13h30-14h30)
('P0039', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-1'),
('P0002', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-4'),
('P0008', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0060', 'poster', 2, NULL, '13h30-14h30', 'T3', 'T3-1'),
('P0026', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0042', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0055', 'poster', 2, NULL, '13h30-14h30', 'T3', 'T3-3'),
('P0050', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0053', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-1'),
('P0058', 'poster', 2, NULL, '13h30-14h30', 'T3', 'T3-1'),
('P0046', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0017', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0005', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0023', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0020', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0056', 'poster', 2, NULL, '13h30-14h30', 'T3', 'T3-2'),
('P0029', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-4'),
('P0011', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-4'),
('P0036', 'poster', 2, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0014', 'poster', 2, NULL, '13h30-14h30', 'T1', 'T1-1'),

-- Posters Dia 3 (13h30-14h30)
('P0032', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0054', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0012', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-3'),
('P0040', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0027', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0044', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0048', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0024', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-2'),
('P0009', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0034', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-1'),
('P0006', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-4'),
('P0043', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0015', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-3'),
('P0018', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-4'),
('P0047', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-3'),
('P0030', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-2'),
('P0051', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),
('P0003', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0021', 'poster', 3, NULL, '13h30-14h30', 'T1', 'T1-1'),
('P0037', 'poster', 3, NULL, '13h30-14h30', 'T2', 'T2-2'),

-- SIRR Web Discovery Activities (available all days)
('SIRR1', 'sirr', 1, NULL, NULL, NULL, NULL),
('SIRR2', 'sirr', 1, NULL, NULL, NULL, NULL),
('SIRR3', 'sirr', 1, NULL, NULL, NULL, NULL),
('SIRR4', 'sirr', 1, NULL, NULL, NULL, NULL),

-- Happy Hour
('HH1', 'happyhour', 1, NULL, NULL, NULL, NULL);
