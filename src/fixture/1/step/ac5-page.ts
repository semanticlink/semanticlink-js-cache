export const self = 'https://api.example.com/step/ac50e024ff';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'steps',
                href: 'https://api.example.com/step/ac50e024ff/step',
            },
            {
                rel: 'edit-form',
                href: 'https://api.example.com/step/form/edit',
            },
        ],
    name: 'About you',
    description: 'Basic information that is required',
    order: 1,
    type: '//enum/step/section/page',
};
