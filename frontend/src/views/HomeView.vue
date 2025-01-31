<script setup>
import { storeToRefs } from 'pinia';
import { Form} from 'vee-validate';
import { useAuthStore, useUsersStore, useExperimentsStore } from '@/stores';

const authStore = useAuthStore();
const { user: authUser } = storeToRefs(authStore);

const usersStore = useUsersStore();
const { users } = storeToRefs(usersStore);

const experimentsStore = useExperimentsStore();
const { experimentList, activeExperiment } = storeToRefs(experimentsStore);

//usersStore.getAll();
experimentsStore.getAll();

console.log(experimentsStore);

async function onExperimentOpen(values) {
    console.log("onExperimentOpen");
    const exp = values;
    console.log(exp.id  );
    experimentsStore.activeExperiment.title = exp.title;
    experimentsStore.activeExperiment.description = exp.description;
    await experimentsStore.startExperiment(exp.id);
}
</script>

<template>
    <div>
        <h3>List of experiments:</h3>
        <table v-if="experimentList.length" class="table table-striped">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="experiment in experimentList"  :key="experiment.id">
                    <td>{{experiment.title}}</td>
                    <td>{{experiment.description}}</td>
                    <td><Form @submit="onExperimentOpen(experiment)"> <button class="btn btn-primary" > Open </button> </Form></td>
                </tr>
            </tbody>
        </table>
        <div v-if="experimentList.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="experimentList.error" class="text-danger">Error loading experiment token: {{experimentList.error}}</div>
    </div>
</template>
