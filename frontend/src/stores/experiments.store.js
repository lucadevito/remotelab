import { defineStore } from 'pinia';

import { fetchWrapper, router } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/experiments`;

export const useExperimentsStore = defineStore({
    id: 'experiments',
    state: () => ({
        experimentList: null,
        activeExperiment: {
            id: 0,
            resources: [],
            tokenList: [],
            title: '',
            description: ''
        }
    }),
    actions: {
        async getAll() {
            this.experimentList = { loading: true };
            fetchWrapper.get(baseUrl)
                .then(experimentList => this.experimentList = experimentList)
                .catch(error => this.experimentList = { error })
            
        },
        async startExperiment(idn) {

            const expInList = this.experimentList.find(el => el.id === idn);

            this.activeExperiment = {...expInList};
            console.log('VueApp: this.startExperiment, resources='+JSON.stringify(this.activeExperiment.resources));
            console.log('VueApp: startExperiment, id='+this.activeExperiment.id);
            this.activeExperiment.resources.forEach( (res) => {
                res.loading = true;
            });
            const ret = await fetchWrapper.post(`${baseUrl}/start`, { id: idn });
            console.log('VueApp: startExperiment, experiment/start returned '+JSON.stringify(ret));
            ret.valueList.forEach((v,i) => {
                this.activeExperiment.resources[i].value = v;
            });
            
            console.log('VueApp: startExperiment, activeExperiment='+JSON.stringify(this.activeExperiment));

            localStorage.setItem('experimentOpen', 'true');

            router.push('/experiment');
        },
        async stopExperiment(idn) {
            console.log('VueApp: stopExperiment, id='+this.activeExperiment.id);

            await fetchWrapper.post(`${baseUrl}/stop`, { id: idn });
            localStorage.setItem('experimentOpen', 'false');
        }
    }
});
