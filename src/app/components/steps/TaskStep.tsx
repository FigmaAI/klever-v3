import * as React from 'react';
import {
    Typography,
    Card,
    CardContent,
    CardOverflow,
    Button,
    Box,
    Textarea,
} from '@mui/joy';

import { FaceRetouchingNatural, AutoAwesome } from '@mui/icons-material';

interface TaskStepProps {
    taskDesc: string;
    personaDesc: string;
    isConnecting: boolean;
    onTaskDescChange: (value: string) => void;
    onPersonaClick: () => void;
    onExplore: () => void;
    onBack: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const TaskStep = ({
    taskDesc,
    personaDesc,
    isConnecting,
    onTaskDescChange,
    onPersonaClick,
    onExplore,
    onBack,
    onKeyDown
}: TaskStepProps) => (
    <Card variant="outlined">
        <CardOverflow
            variant="soft"
            color="primary"
            sx={{
                justifyContent: 'center',
                letterSpacing: '1px',
                padding: '0.5rem 1rem',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 'xs', fontWeight: 'xl', textTransform: 'uppercase' }}>
                    Task and Persona
                </Typography>
                <Button color="neutral" variant="plain" onClick={onBack} disabled={isConnecting} size="sm">
                    Reset
                </Button>
            </Box>
        </CardOverflow>

        <CardContent>
            <Textarea
                placeholder="Enter task description"
                value={taskDesc}
                onChange={(e) => onTaskDescChange(e.target.value)}
                onKeyDown={onKeyDown}
                minRows={2}
                maxRows={6}
                size="md"
                sx={{ minHeight: 240 }}
                required
                endDecorator={
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 'var(--Textarea-paddingBlock)',
                            pt: 'var(--Textarea-paddingBlock)',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            flex: 'auto',
                        }}
                    >
                        <Button
                            variant="plain"
                            color="neutral"
                            onClick={onPersonaClick}
                            startDecorator={<FaceRetouchingNatural fontSize="small" />}
                            size="sm"
                        >
                            {personaDesc ? 'Edit Persona' : 'Set Persona'}
                        </Button>

                        <Button
                            variant="solid"
                            onClick={onExplore}
                            disabled={!taskDesc}
                            startDecorator={<AutoAwesome fontSize="small" />}
                            size="sm"
                            sx={{ ml: 'auto' }}
                        >
                            Submit
                        </Button>
                    </Box>
                }
            />
        </CardContent>
    </Card>
); 